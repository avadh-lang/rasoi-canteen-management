import { quote, type CartLine, type PricedItem, type Quote } from "./pricing";

export const GROUP_LIMITS = { maxMembers: 8, expiresAfterMinutes: 90, codeLength: 4 } as const;

// No I, L, O: they get misread when a code is shouted across the canteen.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";

export function makeCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < GROUP_LIMITS.codeLength; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

export function normaliseCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  const valid = code.length === GROUP_LIMITS.codeLength && [...code].every((c) => CODE_ALPHABET.includes(c));
  return valid ? code : null;
}

export type Share = { userId: string; quote: Quote };
export type Split = {
  shares: Share[];
  combined: CartLine[];
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  prepMinutes: number;
};

/**
 * Each person pays for exactly what they ordered, GST included. Tax is
 * rounded per person, and the order's tax is the sum of those, so the
 * shares always add up to the bill to the paisa.
 *
 * Stock is checked on the combined quantities: two friends each asking
 * for the last 3 vada pav can't both get them.
 */
export function splitBill(
  linesByUser: Map<string, CartLine[]>,
  catalog: Map<string, PricedItem>,
  taxBasisPoints: number,
): Split {
  const shares: Share[] = [];
  const merged = new Map<string, number>();
  for (const [userId, lines] of linesByUser) {
    if (lines.length === 0) continue;
    shares.push({ userId, quote: quote(lines, catalog, taxBasisPoints) });
    for (const l of lines) merged.set(l.menuItemId, (merged.get(l.menuItemId) ?? 0) + l.qty);
  }
  if (shares.length === 0) throw new SplitError("Nobody has added anything yet.");

  const combined = [...merged].map(([menuItemId, qty]) => ({ menuItemId, qty }));
  for (const { menuItemId, qty } of combined) {
    const item = catalog.get(menuItemId)!;
    if (item.stock !== null && qty > item.stock) {
      throw new SplitError(`The table wants ${qty} ${item.name} but only ${item.stock} are left.`);
    }
  }

  return {
    shares,
    combined,
    subtotalPaise: shares.reduce((a, s) => a + s.quote.subtotalPaise, 0),
    taxPaise: shares.reduce((a, s) => a + s.quote.taxPaise, 0),
    totalPaise: shares.reduce((a, s) => a + s.quote.totalPaise, 0),
    prepMinutes: Math.max(...shares.map((s) => s.quote.prepMinutes)),
  };
}

export class SplitError extends Error {}

export type GroupState = "OPEN" | "PLACED" | "DISBANDED";

export function isExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() > GROUP_LIMITS.expiresAfterMinutes * 60_000;
}

/** Who is holding the table up. Members with an empty plate don't block it. */
export function waitingOn(members: { userId: string; ready: boolean; itemCount: number }[]) {
  return members.filter((m) => m.itemCount > 0 && !m.ready).map((m) => m.userId);
}
