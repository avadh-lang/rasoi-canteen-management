"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/domain/constants";
import { counterSaleSchema, firstError, topUpSchema } from "@/lib/validation";
import { audit } from "@/server/audit";
import { messageFor, UserFacingError } from "@/server/errors";
import { changeStatus, placeOrder } from "@/server/orders";
import { creditWallet } from "@/server/wallet";

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

export async function moveOrder(orderId: string, to: OrderStatus): Promise<Result<{ token: number; refund: string }>> {
  try {
    if (!ORDER_STATUSES.includes(to)) throw new UserFacingError("Unknown status.");
    const actor = await assertRole("KITCHEN", "CASHIER", "ADMIN");
    const result = await changeStatus(orderId, to, actor);
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

async function findAccount(query: string) {
  const q = query.trim();
  if (!q) return null;
  return db.user.findFirst({
    where: { role: "CUSTOMER", active: true, OR: [{ rollNo: q.toUpperCase() }, { email: q.toLowerCase() }] },
    select: { id: true, name: true, rollNo: true, email: true, walletBalance: true },
  });
}

export async function lookupWallet(query: string): Promise<Result<{ account: { id: string; name: string; rollNo: string | null; email: string; walletBalance: number } }>> {
  try {
    await assertRole("CASHIER", "ADMIN");
    const account = await findAccount(query);
    if (!account) return { ok: false, message: "No student with that roll number or email." };
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function counterSale(input: unknown): Promise<Result<{ orderId: string; token: number; status: string }>> {
  try {
    const cashier = await assertRole("CASHIER", "ADMIN");
    const parsed = counterSaleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
    const { lines, paymentMethod, walletLookup, customerName, note } = parsed.data;

    let account = null;
    if (paymentMethod === "WALLET") {
      account = await findAccount(walletLookup);
      if (!account) throw new UserFacingError("Look up the student's wallet before charging it.");
    }

    const order = await placeOrder({
      channel: "COUNTER",
      lines,
      paymentMethod,
      customerName: account?.name ?? customerName,
      userId: account?.id ?? null,
      actorId: cashier.id,
      pickupSlot: null,
      note,
    });
    revalidatePath("/", "layout");
    return { ok: true, orderId: order.id, token: order.token, status: order.status };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function counterTopUp(input: { query: string; amount: number }): Promise<Result<{ name: string; balance: number }>> {
  try {
    const cashier = await assertRole("CASHIER", "ADMIN");
    const parsed = topUpSchema.safeParse({ amount: input.amount });
    if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
    const account = await findAccount(input.query);
    if (!account) return { ok: false, message: "No student with that roll number or email." };

    const balance = await db.$transaction(async (tx) => {
      const after = await creditWallet(tx, account.id, parsed.data.amountPaise, "TOPUP", `Cash at counter (${cashier.name})`);
      await audit(tx, {
        actorId: cashier.id,
        action: "wallet.topup",
        entity: "User",
        entityId: account.id,
        detail: `${parsed.data.amountPaise} cash for ${account.rollNo ?? account.email}`,
      });
      return after;
    });
    revalidatePath("/", "layout");
    return { ok: true, name: account.name, balance };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}
