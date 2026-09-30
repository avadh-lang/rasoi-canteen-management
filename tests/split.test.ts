// White-box tests for src/lib/domain/split.ts (group orders).
import { describe, expect, it } from "vitest";
import { CartError, type PricedItem } from "@/lib/domain/pricing";
import { CODE_ALPHABET, isExpired, makeCode, normaliseCode, splitBill, SplitError, waitingOn } from "@/lib/domain/split";

const item = (id: string, pricePaise: number, over: Partial<PricedItem> = {}): PricedItem => ({
  id, name: id, pricePaise, isAvailable: true, stock: null, prepMinutes: 5, ...over,
});
const catalog = new Map<string, PricedItem>([
  ["chai", item("chai", 1200, { prepMinutes: 2 })],
  ["dosa", item("dosa", 5500, { prepMinutes: 10 })],
  ["vadapav", item("vadapav", 1800, { stock: 3 })],
  ["samosa", item("samosa", 3000)],
]);

describe("splitBill", () => {
  it("charges each person for their own plate, GST included", () => {
    const split = splitBill(
      new Map([
        ["aarav", [{ menuItemId: "dosa", qty: 1 }]],
        ["diya", [{ menuItemId: "chai", qty: 2 }]],
      ]),
      catalog,
      500,
    );
    expect(split.shares.map((s) => [s.userId, s.quote.totalPaise])).toEqual([
      ["aarav", 5775],
      ["diya", 2520],
    ]);
    expect(split.totalPaise).toBe(5775 + 2520);
    expect(split.prepMinutes).toBe(10);
  });

  it("shares add up to the bill exactly, even when tax rounds per person", () => {
    // 3 × ₹10.10 → tax 50.5p each, rounded to 51p per person
    const odd = new Map([["x", item("x", 1010)]]);
    const people = new Map(["a", "b", "c"].map((u) => [u, [{ menuItemId: "x", qty: 1 }]]));
    const split = splitBill(people, odd, 500);
    expect(split.taxPaise).toBe(153);
    expect(split.shares.reduce((a, s) => a + s.quote.totalPaise, 0)).toBe(split.totalPaise);
    expect(split.subtotalPaise + split.taxPaise).toBe(split.totalPaise);
  });

  it("skips members with an empty plate", () => {
    const split = splitBill(new Map([["a", [{ menuItemId: "chai", qty: 1 }]], ["b", []]]), catalog, 500);
    expect(split.shares).toHaveLength(1);
  });

  it("rejects a table where nobody ordered", () => {
    expect(() => splitBill(new Map([["a", []]]), catalog, 500)).toThrow(SplitError);
  });

  it("checks stock against the whole table's combined quantity", () => {
    const people = new Map([
      ["a", [{ menuItemId: "vadapav", qty: 2 }]],
      ["b", [{ menuItemId: "vadapav", qty: 2 }]],
    ]);
    expect(() => splitBill(people, catalog, 500)).toThrow("The table wants 4 vadapav but only 3 are left.");
  });

  it("combines duplicate dishes for the kitchen ticket", () => {
    const split = splitBill(
      new Map([
        ["a", [{ menuItemId: "samosa", qty: 1 }]],
        ["b", [{ menuItemId: "samosa", qty: 2 }, { menuItemId: "chai", qty: 1 }]],
      ]),
      catalog,
      500,
    );
    expect(split.combined).toEqual([{ menuItemId: "samosa", qty: 3 }, { menuItemId: "chai", qty: 1 }]);
  });

  it("surfaces per-person cart errors (e.g. unavailable dish)", () => {
    const off = new Map(catalog).set("chai", item("chai", 1200, { isAvailable: false }));
    expect(() => splitBill(new Map([["a", [{ menuItemId: "chai", qty: 1 }]]]), off, 500)).toThrow(CartError);
  });
});

describe("table codes", () => {
  it("makes 4-letter codes from the unambiguous alphabet", () => {
    const code = makeCode();
    expect(code).toMatch(/^[A-Z]{4}$/);
    expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    expect(makeCode(() => 0)).toBe("AAAA");
    expect(makeCode(() => 0.9999)).toBe("ZZZZ");
  });
  it("normalises typed codes and rejects bad ones", () => {
    expect(normaliseCode(" vada ")).toBe("VADA");
    expect(normaliseCode("CHA")).toBeNull();
    expect(normaliseCode("OIL1")).toBeNull(); // O, I, L, 1 are never issued
  });
});

describe("group lifecycle helpers", () => {
  it("expires tables after 90 minutes", () => {
    const now = new Date("2026-10-01T08:00:00Z");
    expect(isExpired(new Date("2026-10-01T06:31:00Z"), now)).toBe(false);
    expect(isExpired(new Date("2026-10-01T06:29:00Z"), now)).toBe(true);
  });
  it("waits only on members who ordered but haven't confirmed", () => {
    expect(
      waitingOn([
        { userId: "a", ready: true, itemCount: 2 },
        { userId: "b", ready: false, itemCount: 1 },
        { userId: "c", ready: false, itemCount: 0 },
      ]),
    ).toEqual(["b"]);
  });
});
