const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹18 for whole rupees, ₹69.30 when there are paise. */
export function rupees(paise: number): string {
  return paise % 100 === 0 ? whole.format(paise / 100) : exact.format(paise / 100);
}

export function toPaise(rupeeInput: string | number): number {
  const n = typeof rupeeInput === "number" ? rupeeInput : Number(rupeeInput);
  if (!Number.isFinite(n)) throw new Error("Not a number");
  return Math.round(n * 100);
}
