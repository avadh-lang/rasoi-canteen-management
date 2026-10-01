import "server-only";
import { PrismaClient } from "@prisma/client";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Orders touch stock, wallets, tokens and the audit log in one transaction;
    // give it headroom over a network round trip to a hosted Postgres.
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export async function getSettings(tx: Tx | typeof db = db) {
  return tx.canteenSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
