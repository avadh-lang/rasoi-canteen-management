const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function rupees(paise: number): string {
  return inr.format(paise / 100);
}

export function toPaise(rupeeInput: string | number): number {
  const n = typeof rupeeInput === "number" ? rupeeInput : Number(rupeeInput);
  if (!Number.isFinite(n)) throw new Error("Not a number");
  return Math.round(n * 100);
}
