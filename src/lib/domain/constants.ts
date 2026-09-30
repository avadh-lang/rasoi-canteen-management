export const ROLES = ["CUSTOMER", "KITCHEN", "CASHIER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = ["PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["WALLET", "UPI", "CASH"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CHANNELS = ["ONLINE", "COUNTER"] as const;
export type Channel = (typeof CHANNELS)[number];

export const LIMITS = {
  maxLines: 15,
  maxQtyPerLine: 20,
  minTopUpPaise: 50_00,
  maxTopUpPaise: 2000_00,
  maxWalletPaise: 5000_00,
} as const;

export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/menu",
  KITCHEN: "/kitchen",
  CASHIER: "/counter",
  ADMIN: "/admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Student / staff",
  KITCHEN: "Kitchen",
  CASHIER: "Counter",
  ADMIN: "Manager",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Received",
  PREPARING: "Cooking",
  READY: "Ready at counter",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
