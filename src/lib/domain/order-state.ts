import type { OrderStatus, Role } from "./constants";

/**
 * Order lifecycle:
 *
 *   PLACED ──▶ PREPARING ──▶ READY ──▶ COLLECTED
 *     │            │
 *     └──────┬─────┘
 *            ▼
 *        CANCELLED
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COLLECTED"],
  COLLECTED: [],
  CANCELLED: [],
};

/** Which roles may move an order into each status. */
const ACTORS: Record<OrderStatus, readonly Role[]> = {
  PLACED: [],
  PREPARING: ["KITCHEN", "ADMIN"],
  READY: ["KITCHEN", "ADMIN"],
  COLLECTED: ["CASHIER", "KITCHEN", "ADMIN"],
  CANCELLED: ["CUSTOMER", "KITCHEN", "ADMIN"],
};

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: { role: Role; ownsOrder: boolean },
): TransitionCheck {
  if (from === to) return { ok: false, reason: `Order is already ${to.toLowerCase()}.` };
  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `An order that is ${from.toLowerCase()} can't move to ${to.toLowerCase()}.` };
  }
  if (!ACTORS[to].includes(actor.role)) {
    return { ok: false, reason: "Your role can't make this change." };
  }
  if (actor.role === "CUSTOMER") {
    if (!actor.ownsOrder) return { ok: false, reason: "You can only cancel your own orders." };
    if (from !== "PLACED") return { ok: false, reason: "The kitchen has started cooking. Ask at the counter." };
  }
  return { ok: true };
}

/** Timestamp column to stamp when entering a status. */
export function timestampFieldFor(to: OrderStatus) {
  switch (to) {
    case "PREPARING":
      return "preparingAt" as const;
    case "READY":
      return "readyAt" as const;
    case "COLLECTED":
      return "collectedAt" as const;
    case "CANCELLED":
      return "cancelledAt" as const;
    default:
      return null;
  }
}

/**
 * Where the money goes when a paid order is cancelled. Anyone with an
 * account gets it back in their wallet instantly; walk-in cash or UPI
 * customers are refunded in cash at the counter.
 */
export function refundOnCancel(order: { paymentMethod: string; paymentStatus: string; hasAccount: boolean }) {
  if (order.paymentStatus !== "PAID") return "NONE" as const;
  if (order.paymentMethod === "CASH" || !order.hasAccount) return "CASH_AT_COUNTER" as const;
  return "WALLET" as const;
}
