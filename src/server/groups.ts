import "server-only";
import { Prisma } from "@prisma/client";
import { db, getSettings, type Tx } from "@/lib/db";
import { LIMITS } from "@/lib/domain/constants";
import type { CartLine } from "@/lib/domain/pricing";
import { GROUP_LIMITS, isExpired, makeCode, splitBill, SplitError, waitingOn } from "@/lib/domain/split";
import { businessDate } from "@/lib/domain/time";
import { rupees } from "@/lib/money";
import { audit } from "./audit";
import { UserFacingError } from "./errors";
import { assertSlot, catalogFor, nextToken, reserveStock } from "./orders";

export const groupInclude = {
  host: { select: { id: true, name: true } },
  members: { orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, name: true, walletBalance: true } } } },
  lines: { include: { menuItem: true } },
  order: { select: { id: true, token: true, status: true } },
} satisfies Prisma.GroupOrderInclude;

export type GroupView = Prisma.GroupOrderGetPayload<{ include: typeof groupInclude }>;

/** An OPEN table that has sat idle too long is treated as closed. */
function assertOpen(group: { status: string; createdAt: Date }) {
  if (group.status === "PLACED") throw new UserFacingError("This table's order has already gone to the kitchen.");
  if (group.status === "DISBANDED") throw new UserFacingError("The host closed this table.");
  if (isExpired(group.createdAt)) throw new UserFacingError("This table expired. Start a new one.");
}

async function seat(tx: Tx, groupId: string, userId: string) {
  const member = await tx.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!member) throw new UserFacingError("Join the table first.");
  return member;
}

export async function openTableFor(userId: string) {
  const seats = await db.groupMember.findMany({
    where: { userId, group: { status: "OPEN" } },
    include: { group: { select: { code: true, createdAt: true } } },
    orderBy: { joinedAt: "desc" },
  });
  return seats.find((s) => !isExpired(s.group.createdAt))?.group.code ?? null;
}

export async function createTable(hostId: string) {
  const existing = await openTableFor(hostId);
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const group = await db.$transaction(async (tx) => {
        const g = await tx.groupOrder.create({ data: { code: makeCode(), hostId, members: { create: { userId: hostId } } } });
        await audit(tx, { actorId: hostId, action: "table.opened", entity: "GroupOrder", entityId: g.id, detail: g.code });
        return g;
      });
      return group.code;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  throw new UserFacingError("Couldn't find a free table code. Try again.");
}

export async function joinTable(userId: string, code: string) {
  return db.$transaction(async (tx) => {
    const group = await tx.groupOrder.findUnique({ where: { code }, include: { members: true } });
    if (!group) throw new UserFacingError(`No table with code ${code}. Check the letters with your friend.`);
    if (group.members.some((m) => m.userId === userId)) return group.code;
    assertOpen(group);
    if (group.members.length >= GROUP_LIMITS.maxMembers) throw new UserFacingError(`Tables seat up to ${GROUP_LIMITS.maxMembers}.`);
    await tx.groupMember.create({ data: { groupId: group.id, userId } });
    return group.code;
  });
}

export async function setPlate(userId: string, groupId: string, menuItemId: string, qty: number) {
  await db.$transaction(async (tx) => {
    const group = await tx.groupOrder.findUniqueOrThrow({ where: { id: groupId } });
    assertOpen(group);
    await seat(tx, groupId, userId);
    const where = { groupId_userId_menuItemId: { groupId, userId, menuItemId } };
    if (qty <= 0) {
      await tx.groupLine.deleteMany({ where: { groupId, userId, menuItemId } });
    } else {
      if (qty > LIMITS.maxQtyPerLine) throw new UserFacingError(`Up to ${LIMITS.maxQtyPerLine} of one dish per person.`);
      const item = await tx.menuItem.findUnique({ where: { id: menuItemId } });
      if (!item || !item.isAvailable || item.stock === 0) throw new UserFacingError("That dish is off the menu right now.");
      await tx.groupLine.upsert({ where, update: { qty }, create: { groupId, userId, menuItemId, qty } });
    }
    // Changing your plate means you need to confirm again.
    await tx.groupMember.update({ where: { groupId_userId: { groupId, userId } }, data: { ready: false } });
  });
}

export async function setReady(userId: string, groupId: string, ready: boolean) {
  await db.$transaction(async (tx) => {
    const group = await tx.groupOrder.findUniqueOrThrow({ where: { id: groupId } });
    assertOpen(group);
    await seat(tx, groupId, userId);
    if (ready && (await tx.groupLine.count({ where: { groupId, userId } })) === 0) {
      throw new UserFacingError("Add something to your plate first.");
    }
    await tx.groupMember.update({ where: { groupId_userId: { groupId, userId } }, data: { ready } });
  });
}

export async function leaveTable(userId: string, groupId: string) {
  await db.$transaction(async (tx) => {
    const group = await tx.groupOrder.findUniqueOrThrow({ where: { id: groupId } });
    assertOpen(group);
    if (group.hostId === userId) throw new UserFacingError("You're the host. Close the table instead.");
    await tx.groupLine.deleteMany({ where: { groupId, userId } });
    await tx.groupMember.deleteMany({ where: { groupId, userId } });
  });
}

export async function closeTable(userId: string, groupId: string) {
  await db.$transaction(async (tx) => {
    const group = await tx.groupOrder.findUniqueOrThrow({ where: { id: groupId } });
    if (group.hostId !== userId) throw new UserFacingError("Only the host can close the table.");
    if (group.status !== "OPEN") throw new UserFacingError("This table is already closed.");
    await tx.groupOrder.update({ where: { id: groupId }, data: { status: "DISBANDED" } });
    await audit(tx, { actorId: userId, action: "table.closed", entity: "GroupOrder", entityId: groupId, detail: group.code });
  });
}

/**
 * Places the table as a single kitchen order. In one transaction: validate
 * every plate and the slot, reserve stock for the combined quantities,
 * debit each member's own share from their own wallet, and lock the table.
 * If any friend is short, nothing is charged to anyone.
 */
export async function placeTable(hostId: string, groupId: string, pickupSlot: Date, note: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const now = new Date();
        const group = await tx.groupOrder.findUniqueOrThrow({ where: { id: groupId }, include: groupInclude });
        if (group.hostId !== hostId) throw new UserFacingError("Only the host can place the table order.");
        assertOpen(group);

        const settings = await getSettings(tx);
        if (!settings.acceptingOrders) throw new UserFacingError("The canteen has paused orders for now.");

        const plates = new Map<string, CartLine[]>();
        for (const m of group.members) plates.set(m.userId, []);
        for (const l of group.lines) plates.get(l.userId)?.push({ menuItemId: l.menuItemId, qty: l.qty });

        const names = new Map(group.members.map((m) => [m.userId, m.user.name]));
        const pending = waitingOn(group.members.map((m) => ({ userId: m.userId, ready: m.ready, itemCount: plates.get(m.userId)!.length })));
        if (pending.length) throw new UserFacingError(`Waiting for ${pending.map((id) => names.get(id)).join(", ")} to tap "I'm in".`);

        const allLines = group.lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty }));
        const catalog = await catalogFor(tx, allLines);
        let split;
        try {
          split = splitBill(plates, catalog, settings.taxBasisPoints);
        } catch (e) {
          if (e instanceof SplitError) throw new UserFacingError(e.message);
          throw e;
        }

        await assertSlot(tx, now, settings, split.prepMinutes, pickupSlot);
        await reserveStock(tx, split.combined, catalog);

        const dateKey = businessDate(now);
        const token = await nextToken(tx, dateKey);
        const eaters = split.shares.length;
        const order = await tx.order.create({
          data: {
            token,
            businessDate: dateKey,
            channel: "ONLINE",
            customerName: `${group.host.name.split(" ")[0]}'s table of ${eaters}`,
            userId: hostId,
            groupId,
            pickupSlot,
            subtotalPaise: split.subtotalPaise,
            taxPaise: split.taxPaise,
            totalPaise: split.totalPaise,
            paymentMethod: "WALLET",
            paymentRef: `TBL-${group.code}-${token}`,
            note,
            items: {
              create: split.combined.map((l) => {
                const item = catalog.get(l.menuItemId)!;
                return { menuItemId: l.menuItemId, name: item.name, unitPaise: item.pricePaise, qty: l.qty, linePaise: item.pricePaise * l.qty };
              }),
            },
          },
        });

        for (const share of split.shares) {
          const amount = share.quote.totalPaise;
          const { count } = await tx.user.updateMany({
            where: { id: share.userId, walletBalance: { gte: amount } },
            data: { walletBalance: { decrement: amount } },
          });
          if (count === 0) {
            throw new UserFacingError(`${names.get(share.userId)}'s wallet can't cover their ${rupees(amount)} share. They need to top up first.`);
          }
          const { walletBalance } = await tx.user.findUniqueOrThrow({ where: { id: share.userId }, select: { walletBalance: true } });
          await tx.walletTxn.create({
            data: { userId: share.userId, type: "PAYMENT", amountPaise: -amount, balanceAfter: walletBalance, reference: `Table order #${token} (your share)` },
          });
          await tx.groupMember.update({ where: { groupId_userId: { groupId, userId: share.userId } }, data: { sharePaise: amount } });
        }

        await tx.groupOrder.update({ where: { id: groupId }, data: { status: "PLACED" } });
        await audit(tx, {
          actorId: hostId,
          action: "order.placed",
          entity: "Order",
          entityId: order.id,
          detail: `#${token}, table ${group.code} of ${eaters}, ${rupees(split.totalPaise)} split by wallet`,
        });
        return order;
      });
    } catch (error) {
      const tokenClash = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 2;
      if (!tokenClash) throw error;
    }
  }
}
