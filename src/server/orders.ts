import "server-only";
import { Prisma } from "@prisma/client";
import { db, getSettings, type Tx } from "@/lib/db";
import type { Channel, OrderStatus, PaymentMethod, Role } from "@/lib/domain/constants";
import { canTransition, refundOnCancel, timestampFieldFor } from "@/lib/domain/order-state";
import { quote, type CartLine, type PricedItem } from "@/lib/domain/pricing";
import { upcomingSlots } from "@/lib/domain/slots";
import { businessDate, istMidnight } from "@/lib/domain/time";
import { rupees } from "@/lib/money";
import { audit } from "./audit";
import { UserFacingError } from "./errors";
import { creditWallet, debitWallet, mockUpiRef } from "./wallet";

export type PlaceOrderInput = {
  channel: Channel;
  lines: CartLine[];
  paymentMethod: PaymentMethod;
  customerName: string;
  userId: string | null; // the account that owns and pays for the order
  actorId: string; // who pressed the button (student or cashier)
  pickupSlot: Date | null;
  note: string;
};

async function catalogFor(tx: Tx, lines: CartLine[]) {
  const items = await tx.menuItem.findMany({ where: { id: { in: lines.map((l) => l.menuItemId) } } });
  return new Map<string, PricedItem>(items.map((i) => [i.id, i]));
}

/** Orders per pickup slot today, excluding cancellations. */
export async function slotBookings(tx: Tx | typeof db, now = new Date()) {
  const start = istMidnight(businessDate(now));
  const rows = await tx.order.groupBy({
    by: ["pickupSlot"],
    where: { pickupSlot: { gte: start }, status: { not: "CANCELLED" } },
    _count: { _all: true },
  });
  return new Map(rows.filter((r) => r.pickupSlot).map((r) => [r.pickupSlot!.getTime(), r._count._all]));
}

async function nextToken(tx: Tx, dateKey: string) {
  const last = await tx.order.findFirst({ where: { businessDate: dateKey }, orderBy: { token: "desc" }, select: { token: true } });
  return (last?.token ?? 100) + 1;
}

async function placeOnce(input: PlaceOrderInput) {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const settings = await getSettings(tx);
    if (!settings.acceptingOrders) throw new UserFacingError("The canteen has paused orders for now.");

    const catalog = await catalogFor(tx, input.lines);
    const q = quote(input.lines, catalog, settings.taxBasisPoints);

    if (input.channel === "ONLINE") {
      if (!input.pickupSlot) throw new UserFacingError("Pick a pickup time.");
      const slots = upcomingSlots(now, settings, q.prepMinutes, await slotBookings(tx, now));
      const chosen = slots.find((s) => s.startsAt.getTime() === input.pickupSlot!.getTime());
      if (!chosen) throw new UserFacingError("That pickup time has passed or is too soon for this order. Pick another.");
      if (chosen.full) throw new UserFacingError(`${chosen.label} just filled up. Pick another time.`);
    }

    // Reserve stock; the WHERE guard stops overselling under concurrent orders.
    for (const line of q.lines) {
      if (catalog.get(line.menuItemId)!.stock === null) continue;
      const { count } = await tx.menuItem.updateMany({
        where: { id: line.menuItemId, stock: { gte: line.qty } },
        data: { stock: { decrement: line.qty } },
      });
      if (count === 0) throw new UserFacingError(`${line.name} sold out while you were ordering.`);
    }

    const dateKey = businessDate(now);
    const token = await nextToken(tx, dateKey);
    const paymentRef =
      input.paymentMethod === "UPI" ? mockUpiRef() : input.paymentMethod === "WALLET" ? `WAL-${dateKey}-${token}` : null;

    // Packaged-only counter sales (chips, bottled drinks) are handed over on the spot.
    const handedOver = input.channel === "COUNTER" && q.prepMinutes === 0;

    const order = await tx.order.create({
      data: {
        token,
        businessDate: dateKey,
        channel: input.channel,
        status: handedOver ? "COLLECTED" : "PLACED",
        collectedAt: handedOver ? now : null,
        customerName: input.customerName || "Walk-in",
        userId: input.userId,
        handledById: input.channel === "COUNTER" ? input.actorId : null,
        pickupSlot: input.pickupSlot,
        subtotalPaise: q.subtotalPaise,
        taxPaise: q.taxPaise,
        totalPaise: q.totalPaise,
        paymentMethod: input.paymentMethod,
        paymentRef,
        note: input.note,
        items: {
          create: q.lines.map((l) => ({
            menuItemId: l.menuItemId,
            name: l.name,
            unitPaise: l.unitPaise,
            qty: l.qty,
            linePaise: l.linePaise,
          })),
        },
      },
    });

    if (input.paymentMethod === "WALLET") {
      if (!input.userId) throw new UserFacingError("Find the student's wallet before charging it.");
      await debitWallet(tx, input.userId, q.totalPaise, `Order #${token}`);
    }

    await audit(tx, {
      actorId: input.actorId,
      action: "order.placed",
      entity: "Order",
      entityId: order.id,
      detail: `#${token}, ${input.channel.toLowerCase()}, ${rupees(q.totalPaise)} by ${input.paymentMethod.toLowerCase()}`,
    });
    return order;
  });
}

export async function placeOrder(input: PlaceOrderInput) {
  // Two orders racing for the same token hit the unique index; retry once with the next number.
  for (let attempt = 0; ; attempt++) {
    try {
      return await placeOnce(input);
    } catch (error) {
      const tokenClash =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 2;
      if (!tokenClash) throw error;
    }
  }
}

export async function changeStatus(orderId: string, to: OrderStatus, actor: { id: string; role: Role }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new UserFacingError("That order doesn't exist.");

    const from = order.status as OrderStatus;
    const check = canTransition(from, to, { role: actor.role, ownsOrder: order.userId === actor.id });
    if (!check.ok) throw new UserFacingError(check.reason);

    const stamp = timestampFieldFor(to);
    // Compare-and-set on the old status: if someone else moved it first, stop.
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: from },
      data: { status: to, ...(stamp ? { [stamp]: new Date() } : {}) },
    });
    if (count === 0) throw new UserFacingError("Someone else just updated this order. Refresh to see it.");

    let refund: ReturnType<typeof refundOnCancel> = "NONE";
    if (to === "CANCELLED") {
      for (const item of order.items) {
        await tx.menuItem.updateMany({
          where: { id: item.menuItemId, stock: { not: null } },
          data: { stock: { increment: item.qty } },
        });
      }
      refund = refundOnCancel({ ...order, hasAccount: order.userId !== null });
      if (refund === "WALLET") await creditWallet(tx, order.userId!, order.totalPaise, "REFUND", `Order #${order.token} cancelled`);
      if (refund !== "NONE") await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
    }

    await audit(tx, {
      actorId: actor.id,
      action: `order.${to.toLowerCase()}`,
      entity: "Order",
      entityId: orderId,
      detail: `#${order.token}${refund === "WALLET" ? `, ${rupees(order.totalPaise)} refunded to wallet` : refund === "CASH_AT_COUNTER" ? ", refund cash at counter" : ""}`,
    });
    return { token: order.token, refund };
  });
}
