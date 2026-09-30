// White-box tests for src/lib/domain/pricing.ts — one case per guard in quote().
import { describe, expect, it } from "vitest";
import { CartError, normaliseCart, quote, taxFor, type PricedItem } from "@/lib/domain/pricing";
import { rupees, toPaise } from "@/lib/money";

const item = (id: string, over: Partial<PricedItem> = {}): PricedItem => ({
  id,
  name: id,
  pricePaise: 1800,
  isAvailable: true,
  stock: null,
  prepMinutes: 3,
  ...over,
});
const catalog = new Map<string, PricedItem>([
  ["vadapav", item("vadapav", { name: "Vada pav", pricePaise: 1800, stock: 5 })],
  ["chai", item("chai", { name: "Cutting chai", pricePaise: 1200, prepMinutes: 2 })],
  ["dosa", item("dosa", { name: "Masala dosa", pricePaise: 5500, prepMinutes: 10 })],
  ["biryani", item("biryani", { name: "Chicken biryani", pricePaise: 13000, isAvailable: false })],
  ["samosa", item("samosa", { name: "Samosa", stock: 0 })],
]);

describe("normaliseCart", () => {
  it("merges repeated items", () => {
    expect(normaliseCart([{ menuItemId: "chai", qty: 2 }, { menuItemId: "chai", qty: 1 }])).toEqual([
      { menuItemId: "chai", qty: 3 },
    ]);
  });
  it.each([0, -1, 1.5])("rejects qty %s", (qty) => {
    expect(() => normaliseCart([{ menuItemId: "chai", qty }])).toThrow(CartError);
  });
});

describe("taxFor", () => {
  it("applies 5% GST and rounds half up", () => {
    expect(taxFor(1000, 500)).toBe(50);
    expect(taxFor(1010, 500)).toBe(51); // 50.5 → 51
    expect(taxFor(0, 500)).toBe(0);
  });
});

describe("quote", () => {
  it("prices a normal tray and takes the slowest prep time", () => {
    const q = quote([{ menuItemId: "vadapav", qty: 2 }, { menuItemId: "dosa", qty: 1 }], catalog, 500);
    expect(q.subtotalPaise).toBe(2 * 1800 + 5500);
    expect(q.taxPaise).toBe(455);
    expect(q.totalPaise).toBe(9555);
    expect(q.prepMinutes).toBe(10);
  });

  it("rejects an empty tray", () => {
    expect(() => quote([], catalog, 500)).toThrow("Your tray is empty.");
  });
  it("rejects more than 15 distinct lines", () => {
    const many = Array.from({ length: 16 }, (_, i) => ({ menuItemId: `x${i}`, qty: 1 }));
    expect(() => quote(many, catalog, 500)).toThrow(/15 different items/);
  });
  it("rejects items not on the menu", () => {
    expect(() => quote([{ menuItemId: "ghost", qty: 1 }], catalog, 500)).toThrow(/no longer on the menu/);
  });
  it("rejects unavailable items", () => {
    expect(() => quote([{ menuItemId: "biryani", qty: 1 }], catalog, 500)).toThrow(/off the menu/);
  });
  it("rejects quantities above the per-line cap", () => {
    expect(() => quote([{ menuItemId: "chai", qty: 21 }], catalog, 500)).toThrow(/Up to 20/);
  });
  it("reports sold-out and low-stock separately", () => {
    expect(() => quote([{ menuItemId: "samosa", qty: 1 }], catalog, 500)).toThrow("Samosa just sold out.");
    expect(() => quote([{ menuItemId: "vadapav", qty: 6 }], catalog, 500)).toThrow("Only 5 Vada pav left.");
  });
  it("accepts exactly the remaining stock (boundary)", () => {
    expect(quote([{ menuItemId: "vadapav", qty: 5 }], catalog, 500).subtotalPaise).toBe(9000);
  });
});

describe("money", () => {
  it("formats paise as rupees", () => {
    expect(rupees(1800)).toBe("₹18");
    expect(rupees(9555)).toBe("₹95.55");
  });
  it("parses rupee input", () => {
    expect(toPaise("45.5")).toBe(4550);
    expect(toPaise(12)).toBe(1200);
    expect(() => toPaise("abc")).toThrow();
  });
});
