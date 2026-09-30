import { istMidnight, istParts, minuteLabel } from "./time";

export type SlotRules = {
  openMinute: number;
  closeMinute: number;
  slotMinutes: number;
  slotCapacity: number;
  acceptingOrders: boolean;
};

export type Slot = { startsAt: Date; label: string; booked: number; remaining: number; full: boolean };

/**
 * Pickup slots for today that the kitchen can still make in time.
 * The earliest slot is the first boundary at least `leadMinutes` from now,
 * so a 12-minute dosa is never promised for a slot starting in 5.
 */
export function upcomingSlots(
  now: Date,
  rules: SlotRules,
  leadMinutes: number,
  bookedBySlotStart: Map<number, number>,
): Slot[] {
  if (!rules.acceptingOrders) return [];
  if (rules.slotMinutes <= 0) throw new Error("slotMinutes must be positive");

  const { dateKey, minuteOfDay } = istParts(now);
  const midnight = istMidnight(dateKey).getTime();
  const earliest = Math.max(rules.openMinute, minuteOfDay + Math.max(0, leadMinutes));
  const first = rules.openMinute + Math.ceil((earliest - rules.openMinute) / rules.slotMinutes) * rules.slotMinutes;

  const slots: Slot[] = [];
  for (let m = first; m + rules.slotMinutes <= rules.closeMinute; m += rules.slotMinutes) {
    const startsAt = new Date(midnight + m * 60_000);
    const booked = bookedBySlotStart.get(startsAt.getTime()) ?? 0;
    const remaining = Math.max(0, rules.slotCapacity - booked);
    slots.push({ startsAt, label: minuteLabel(m), booked, remaining, full: remaining === 0 });
  }
  return slots;
}

export function isOpenNow(now: Date, rules: SlotRules): boolean {
  const { minuteOfDay } = istParts(now);
  return rules.acceptingOrders && minuteOfDay >= rules.openMinute && minuteOfDay < rules.closeMinute;
}
