import { z } from "zod";
import { LIMITS, PAYMENT_METHODS, ROLES } from "./domain/constants";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Keep it under 72 characters.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(60),
  email,
  rollNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{4,16}$/, "Roll / staff numbers use 4–16 letters, digits or dashes.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password,
});

export const cartSchema = z
  .array(z.object({ menuItemId: z.string().min(1), qty: z.number().int().min(1).max(LIMITS.maxQtyPerLine) }))
  .min(1, "Your tray is empty.")
  .max(LIMITS.maxLines);

export const checkoutSchema = z.object({
  lines: cartSchema,
  pickupSlot: z.coerce.date(),
  paymentMethod: z.enum(["WALLET", "UPI"]),
  note: z.string().trim().max(140, "Keep kitchen notes under 140 characters.").default(""),
});

export const counterSaleSchema = z.object({
  lines: cartSchema,
  customerName: z.string().trim().max(60).default(""),
  paymentMethod: z.enum(PAYMENT_METHODS),
  walletLookup: z.string().trim().max(80).default(""),
  note: z.string().trim().max(140).default(""),
});

const rupeeAmount = z.coerce
  .number({ message: "Enter an amount in rupees." })
  .positive("Enter an amount above zero.")
  .transform((n) => Math.round(n * 100));

export const topUpSchema = z.object({
  amountPaise: rupeeAmount.refine(
    (p) => p >= LIMITS.minTopUpPaise && p <= LIMITS.maxTopUpPaise,
    `Top up between ₹${LIMITS.minTopUpPaise / 100} and ₹${LIMITS.maxTopUpPaise / 100}.`,
  ),
});

export const menuItemSchema = z.object({
  name: z.string().trim().min(2, "Name the dish.").max(60),
  description: z.string().trim().max(200).default(""),
  price: z.coerce.number().positive("Price must be above zero.").max(2000, "That's more than ₹2000."),
  categoryId: z.string().min(1, "Pick a category."),
  isVeg: z.coerce.boolean(),
  isAvailable: z.coerce.boolean(),
  trackStock: z.coerce.boolean(),
  stock: z.coerce.number().int().min(0).max(10_000).default(0),
  prepMinutes: z.coerce.number().int().min(0).max(90),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  role: z.enum(ROLES),
  password,
});

export const settingsSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
    slotMinutes: z.coerce.number().int().refine((n) => [10, 15, 20, 30].includes(n), "Pick 10, 15, 20 or 30 minutes."),
    slotCapacity: z.coerce.number().int().min(1).max(500),
    acceptingOrders: z.coerce.boolean(),
    taxPercent: z.coerce.number().min(0).max(28),
  })
  .transform((s) => {
    const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
    return {
      openMinute: toMin(s.open),
      closeMinute: toMin(s.close),
      slotMinutes: s.slotMinutes,
      slotCapacity: s.slotCapacity,
      acceptingOrders: s.acceptingOrders,
      taxBasisPoints: Math.round(s.taxPercent * 100),
    };
  })
  .refine((s) => s.closeMinute > s.openMinute, { message: "Closing time must be after opening time." });

export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
