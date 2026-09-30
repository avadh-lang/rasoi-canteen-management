// White-box tests for src/lib/domain/order-state.ts.
// Each case names the branch of canTransition() it drives (B1–B6).
import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/domain/constants";
import { canTransition, isTerminal, nextStatuses, refundOnCancel, timestampFieldFor } from "@/lib/domain/order-state";

const kitchen = { role: "KITCHEN" as const, ownsOrder: false };
const owner = { role: "CUSTOMER" as const, ownsOrder: true };

describe("canTransition", () => {
  it("B1: rejects a no-op move to the same status", () => {
    expect(canTransition("READY", "READY", kitchen)).toEqual({ ok: false, reason: "Order is already ready." });
  });

  it("B2: rejects edges that are not in the lifecycle graph", () => {
    const r = canTransition("PLACED", "READY", kitchen);
    expect(r.ok).toBe(false);
    expect(canTransition("COLLECTED", "CANCELLED", { role: "ADMIN", ownsOrder: false }).ok).toBe(false);
  });

  it("B3: rejects a valid edge when the role may not drive it", () => {
    expect(canTransition("PLACED", "PREPARING", { role: "CASHIER", ownsOrder: false })).toEqual({
      ok: false,
      reason: "Your role can't make this change.",
    });
    expect(canTransition("PLACED", "PREPARING", owner).ok).toBe(false);
  });

  it("B4: customer cannot cancel someone else's order", () => {
    expect(canTransition("PLACED", "CANCELLED", { role: "CUSTOMER", ownsOrder: false })).toEqual({
      ok: false,
      reason: "You can only cancel your own orders.",
    });
  });

  it("B5: customer cannot cancel once cooking has started", () => {
    const r = canTransition("PREPARING", "CANCELLED", owner);
    expect(r.ok).toBe(false);
  });

  it("B6: allows every legal staff move", () => {
    expect(canTransition("PLACED", "PREPARING", kitchen).ok).toBe(true);
    expect(canTransition("PREPARING", "READY", kitchen).ok).toBe(true);
    expect(canTransition("READY", "COLLECTED", { role: "CASHIER", ownsOrder: false }).ok).toBe(true);
    expect(canTransition("PREPARING", "CANCELLED", kitchen).ok).toBe(true);
    expect(canTransition("PLACED", "CANCELLED", owner).ok).toBe(true);
  });

  it("covers the full 5×5 status matrix for the admin role", () => {
    const allowed: string[] = [];
    for (const from of ORDER_STATUSES)
      for (const to of ORDER_STATUSES)
        if (canTransition(from, to, { role: "ADMIN", ownsOrder: false }).ok) allowed.push(`${from}>${to}`);
    expect(allowed.sort()).toEqual(
      ["PLACED>PREPARING", "PLACED>CANCELLED", "PREPARING>READY", "PREPARING>CANCELLED", "READY>COLLECTED"].sort(),
    );
  });
});

describe("lifecycle helpers", () => {
  it("marks only collected and cancelled as terminal", () => {
    const terminal = ORDER_STATUSES.filter((s) => isTerminal(s));
    expect(terminal).toEqual(["COLLECTED", "CANCELLED"]);
    expect(nextStatuses("PLACED")).toContain("PREPARING");
  });

  it.each<[OrderStatus, string | null]>([
    ["PLACED", null],
    ["PREPARING", "preparingAt"],
    ["READY", "readyAt"],
    ["COLLECTED", "collectedAt"],
    ["CANCELLED", "cancelledAt"],
  ])("stamps %s into %s", (status, field) => {
    expect(timestampFieldFor(status)).toBe(field);
  });
});

describe("refundOnCancel", () => {
  it("returns NONE when nothing was paid", () => {
    expect(refundOnCancel({ paymentMethod: "WALLET", paymentStatus: "REFUNDED", hasAccount: true })).toBe("NONE");
  });
  it("hands cash back at the counter", () => {
    expect(refundOnCancel({ paymentMethod: "CASH", paymentStatus: "PAID", hasAccount: true })).toBe("CASH_AT_COUNTER");
  });
  it("refunds walk-in UPI at the counter because there is no wallet", () => {
    expect(refundOnCancel({ paymentMethod: "UPI", paymentStatus: "PAID", hasAccount: false })).toBe("CASH_AT_COUNTER");
  });
  it("credits wallet and UPI payments from account holders to their wallet", () => {
    expect(refundOnCancel({ paymentMethod: "WALLET", paymentStatus: "PAID", hasAccount: true })).toBe("WALLET");
    expect(refundOnCancel({ paymentMethod: "UPI", paymentStatus: "PAID", hasAccount: true })).toBe("WALLET");
  });
});
