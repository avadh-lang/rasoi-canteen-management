import { LIMITS } from "./constants";

export type CartLine = { menuItemId: string; qty: number };
export type PricedItem = {
  id: string;
  name: string;
  pricePaise: number;
  isAvailable: boolean;
  stock: number | null;
  prepMinutes: number;
};
export type PricedLine = { menuItemId: string; name: string; unitPaise: number; qty: number; linePaise: number };
export type Quote = {
  lines: PricedLine[];
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  prepMinutes: number;
};

export class CartError extends Error {}

/** Merge duplicate lines so "2 × chai" + "1 × chai" becomes "3 × chai". */
export function normaliseCart(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty <= 0) throw new CartError("Quantities must be whole numbers above zero.");
    merged.set(line.menuItemId, (merged.get(line.menuItemId) ?? 0) + line.qty);
  }
  return [...merged].map(([menuItemId, qty]) => ({ menuItemId, qty }));
}

/** GST rounded half-up to the nearest paisa. */
export function taxFor(subtotalPaise: number, taxBasisPoints: number): number {
  return Math.round((subtotalPaise * taxBasisPoints) / 10_000);
}

export function quote(lines: CartLine[], catalog: Map<string, PricedItem>, taxBasisPoints: number): Quote {
  const cart = normaliseCart(lines);
  if (cart.length === 0) throw new CartError("Your tray is empty.");
  if (cart.length > LIMITS.maxLines) throw new CartError(`Keep it to ${LIMITS.maxLines} different items per order.`);

  const priced: PricedLine[] = [];
  let prepMinutes = 0;
  for (const { menuItemId, qty } of cart) {
    const item = catalog.get(menuItemId);
    if (!item) throw new CartError("An item in your tray is no longer on the menu.");
    if (!item.isAvailable) throw new CartError(`${item.name} is off the menu right now.`);
    if (qty > LIMITS.maxQtyPerLine) throw new CartError(`Up to ${LIMITS.maxQtyPerLine} of ${item.name} per order.`);
    if (item.stock !== null && qty > item.stock) {
      throw new CartError(item.stock === 0 ? `${item.name} just sold out.` : `Only ${item.stock} ${item.name} left.`);
    }
    prepMinutes = Math.max(prepMinutes, item.prepMinutes);
    priced.push({ menuItemId, name: item.name, unitPaise: item.pricePaise, qty, linePaise: item.pricePaise * qty });
  }

  const subtotalPaise = priced.reduce((sum, l) => sum + l.linePaise, 0);
  const taxPaise = taxFor(subtotalPaise, taxBasisPoints);
  return { lines: priced, subtotalPaise, taxPaise, totalPaise: subtotalPaise + taxPaise, prepMinutes };
}
