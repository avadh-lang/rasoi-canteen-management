import "server-only";
import type { Tx } from "@/lib/db";
import { LIMITS } from "@/lib/domain/constants";
import { rupees } from "@/lib/money";
import { UserFacingError } from "./errors";

/**
 * Debit guarded by the balance in the WHERE clause, so two orders placed at
 * the same moment can never both spend the same rupee.
 */
export async function debitWallet(tx: Tx, userId: string, amountPaise: number, reference: string) {
  const { count } = await tx.user.updateMany({
    where: { id: userId, walletBalance: { gte: amountPaise } },
    data: { walletBalance: { decrement: amountPaise } },
  });
  if (count === 0) {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    throw new UserFacingError(
      `Wallet has ${rupees(user?.walletBalance ?? 0)}; this order needs ${rupees(amountPaise)}. Top up or pay by UPI.`,
    );
  }
  const { walletBalance } = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { walletBalance: true } });
  await tx.walletTxn.create({
    data: { userId, type: "PAYMENT", amountPaise: -amountPaise, balanceAfter: walletBalance, reference },
  });
}

export async function creditWallet(
  tx: Tx,
  userId: string,
  amountPaise: number,
  type: "TOPUP" | "REFUND",
  reference: string,
) {
  if (type === "TOPUP") {
    const current = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { walletBalance: true } });
    if (current.walletBalance + amountPaise > LIMITS.maxWalletPaise) {
      throw new UserFacingError(`Wallets hold up to ${rupees(LIMITS.maxWalletPaise)}.`);
    }
  }
  const { walletBalance } = await tx.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: amountPaise } },
    select: { walletBalance: true },
  });
  await tx.walletTxn.create({ data: { userId, type, amountPaise, balanceAfter: walletBalance, reference } });
  return walletBalance;
}

/** Simulated UPI reference, shaped like a real 12-digit UTR. */
export function mockUpiRef(): string {
  return `UPI${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`;
}
