// White-box tests for src/lib/domain/slots.ts and time.ts.
import { describe, expect, it } from "vitest";
import { isOpenNow, upcomingSlots, type SlotRules } from "@/lib/domain/slots";
import { addDays, businessDate, istMidnight, minuteLabel, minutesSince, timeLabel } from "@/lib/domain/time";

const rules: SlotRules = { openMinute: 8 * 60, closeMinute: 10 * 60, slotMinutes: 15, slotCapacity: 3, acceptingOrders: true };
// 2026-10-01 09:02 IST == 03:32 UTC
const at = (hhmm: string) => new Date(`2026-10-01T${hhmm}:00+05:30`);

describe("upcomingSlots", () => {
  it("returns nothing while orders are paused", () => {
    expect(upcomingSlots(at("09:02"), { ...rules, acceptingOrders: false }, 5, new Map())).toEqual([]);
  });

  it("rejects a zero slot length", () => {
    expect(() => upcomingSlots(at("09:02"), { ...rules, slotMinutes: 0 }, 5, new Map())).toThrow();
  });

  it("starts at opening time when ordering before the canteen opens", () => {
    const slots = upcomingSlots(at("06:00"), rules, 10, new Map());
    expect(slots[0].label).toBe("8:00 am");
    expect(slots).toHaveLength(8);
  });

  it("rounds up to the first slot the kitchen can make in time", () => {
    // 09:02 + 10 min prep = 09:12 → next boundary 09:15
    expect(upcomingSlots(at("09:02"), rules, 10, new Map())[0].label).toBe("9:15 am");
    // exactly on a boundary stays on it
    expect(upcomingSlots(at("09:05"), rules, 10, new Map())[0].label).toBe("9:15 am");
  });

  it("never offers a slot that ends after closing", () => {
    const slots = upcomingSlots(at("09:40"), rules, 0, new Map());
    expect(slots.map((s) => s.label)).toEqual(["9:45 am"]);
    expect(upcomingSlots(at("09:50"), rules, 0, new Map())).toEqual([]);
  });

  it("tracks capacity per slot", () => {
    const nine15 = at("09:15").getTime();
    const slots = upcomingSlots(at("09:02"), rules, 10, new Map([[nine15, 3]]));
    expect(slots[0]).toMatchObject({ booked: 3, remaining: 0, full: true });
    expect(slots[1]).toMatchObject({ booked: 0, remaining: 3, full: false });
  });

  it("treats negative lead time as zero", () => {
    expect(upcomingSlots(at("09:00"), rules, -30, new Map())[0].label).toBe("9:00 am");
  });
});

describe("isOpenNow", () => {
  it("is open inside hours and closed at the closing minute", () => {
    expect(isOpenNow(at("08:00"), rules)).toBe(true);
    expect(isOpenNow(at("10:00"), rules)).toBe(false);
    expect(isOpenNow(at("07:59"), rules)).toBe(false);
    expect(isOpenNow(at("09:00"), { ...rules, acceptingOrders: false })).toBe(false);
  });
});

describe("IST time helpers", () => {
  it("rolls the business date at IST midnight, not UTC", () => {
    expect(businessDate(new Date("2026-09-30T18:29:00Z"))).toBe("2026-09-30");
    expect(businessDate(new Date("2026-09-30T18:30:00Z"))).toBe("2026-10-01");
  });
  it("finds IST midnight and walks days across month ends", () => {
    expect(istMidnight("2026-10-01").toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("labels times in 12-hour format", () => {
    expect(minuteLabel(0)).toBe("12:00 am");
    expect(minuteLabel(12 * 60 + 5)).toBe("12:05 pm");
    expect(minuteLabel(13 * 60 + 30)).toBe("1:30 pm");
    expect(timeLabel(at("09:02"))).toBe("9:02 am");
  });
  it("never reports negative minutes", () => {
    const now = at("09:00");
    expect(minutesSince(at("08:50"), now)).toBe(10);
    expect(minutesSince(at("09:10"), now)).toBe(0);
  });
});
