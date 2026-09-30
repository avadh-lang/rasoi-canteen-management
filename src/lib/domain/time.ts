// The canteen runs on Indian Standard Time (UTC+05:30, no DST).
const IST_OFFSET_MIN = 330;

export function istParts(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return {
    dateKey: shifted.toISOString().slice(0, 10),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function businessDate(date: Date = new Date()): string {
  return istParts(date).dateKey;
}

/** The UTC instant of IST midnight for a YYYY-MM-DD key. */
export function istMidnight(dateKey: string): Date {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() - IST_OFFSET_MIN * 60_000);
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function minuteLabel(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function timeLabel(date: Date): string {
  return minuteLabel(istParts(date).minuteOfDay);
}

export function minutesSince(date: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
}
