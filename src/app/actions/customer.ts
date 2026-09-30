"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";
import { checkoutSchema, firstError, topUpSchema } from "@/lib/validation";
import { audit } from "@/server/audit";
import { messageFor } from "@/server/errors";
import { changeStatus, placeOrder } from "@/server/orders";
import { creditWallet, mockUpiRef } from "@/server/wallet";

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

export async function placeOnlineOrder(input: unknown): Promise<Result<{ orderId: string }>> {
  try {
    const user = await assertRole("CUSTOMER");
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

    const order = await placeOrder({
      channel: "ONLINE",
      lines: parsed.data.lines,
      paymentMethod: parsed.data.paymentMethod,
      customerName: user.name,
      userId: user.id,
      actorId: user.id,
      pickupSlot: parsed.data.pickupSlot,
      note: parsed.data.note,
    });
    revalidatePath("/", "layout");
    return { ok: true, orderId: order.id };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function cancelMyOrder(orderId: string): Promise<Result<{ refunded: boolean }>> {
  try {
    const user = await assertRole("CUSTOMER");
    const { refund } = await changeStatus(orderId, "CANCELLED", user);
    revalidatePath("/", "layout");
    return { ok: true, refunded: refund === "WALLET" };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

/** Self-service top-up. The UPI step is simulated in the browser before this runs. */
export async function topUpMyWallet(input: unknown): Promise<Result<{ balance: number; reference: string }>> {
  try {
    const user = await assertRole("CUSTOMER");
    const parsed = topUpSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

    const reference = mockUpiRef();
    const balance = await db.$transaction(async (tx) => {
      const after = await creditWallet(tx, user.id, parsed.data.amountPaise, "TOPUP", `UPI top-up (${reference})`);
      await audit(tx, { actorId: user.id, action: "wallet.topup", entity: "User", entityId: user.id, detail: `${rupees(parsed.data.amountPaise)} by UPI` });
      return after;
    });
    revalidatePath("/", "layout");
    return { ok: true, balance, reference };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}
