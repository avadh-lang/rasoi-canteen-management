"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { placeOnlineOrder } from "@/app/actions/customer";
import { Stepper, useCart } from "@/components/cart";
import { DietMark } from "@/components/marks";
import { UpiSheet } from "@/components/upi-sheet";
import { taxFor } from "@/lib/domain/pricing";
import { rupees } from "@/lib/money";

type CatalogEntry = { id: string; name: string; prepMinutes: number; isAvailable: boolean; stock: number | null; pricePaise: number };
type SlotView = { at: number; label: string; remaining: number; capacity: number };

export function CheckoutForm({
  now,
  walletPaise,
  taxBasisPoints,
  acceptingOrders,
  slots,
  catalog,
}: {
  now: number;
  walletPaise: number;
  taxBasisPoints: number;
  acceptingOrders: boolean;
  slots: SlotView[];
  catalog: Record<string, CatalogEntry>;
}) {
  const cart = useCart();
  const router = useRouter();
  const [slot, setSlot] = useState<number | null>(null);
  const [pickedMethod, setMethod] = useState<"WALLET" | "UPI" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upiOpen, setUpiOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Use live prices and availability, not what was cached in the tray.
  const lines = cart.items.map((i) => ({ ...i, live: catalog[i.id] }));
  const problems = lines.filter((l) => !l.live || !l.live.isAvailable || (l.live.stock !== null && l.live.stock < l.qty));
  const subtotal = lines.reduce((a, l) => a + (l.live?.pricePaise ?? l.pricePaise) * l.qty, 0);
  const tax = taxFor(subtotal, taxBasisPoints);
  const total = subtotal + tax;
  const lead = Math.max(0, ...lines.map((l) => l.live?.prepMinutes ?? 0));

  // Until the student chooses, suggest the wallet only when it covers the bill.
  const method = pickedMethod ?? (walletPaise >= total ? "WALLET" : "UPI");

  const usable = useMemo(() => slots.filter((s) => s.at >= now + lead * 60_000), [slots, now, lead]);
  const chosen = usable.find((s) => s.at === slot && s.remaining > 0) ?? null;
  const short = method === "WALLET" && walletPaise < total;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await placeOnlineOrder({
        lines: cart.items.map((i) => ({ menuItemId: i.id, qty: i.qty })),
        pickupSlot: new Date(chosen!.at).toISOString(),
        paymentMethod: method,
        note,
      });
      if (!result.ok) {
        setError(result.message);
        router.refresh();
        return;
      }
      cart.clear();
      router.push(`/orders/${result.orderId}?placed=1`);
    });
  }

  if (!cart.ready) return null;

  if (cart.items.length === 0) {
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <h1 className="display text-3xl">Your tray is empty</h1>
        <p className="mt-2 text-muted">Add something from the menu to pick a pickup time.</p>
        <Link href="/menu" className="btn btn-primary mt-6">Back to menu</Link>
      </div>
    );
  }

  const blocked = !acceptingOrders || !chosen || problems.length > 0 || short || pending;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <div>
          <Link href="/menu" className="text-sm font-bold underline decoration-2 underline-offset-4">Back to menu</Link>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Pickup and payment</h1>
        </div>

        <section aria-labelledby="slot-h" className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="slot-h" className="text-xl font-black">When will you pick it up?</h2>
            {lead > 0 && <p className="text-sm text-muted">Your tray takes about {lead} min to make.</p>}
          </div>
          {usable.length === 0 ? (
            <p className="mt-4 border-[3px] border-ink bg-chilli-soft px-4 py-3 font-bold">
              No pickup times left today. The kitchen can&rsquo;t take new orders until tomorrow.
            </p>
          ) : (
            <div role="radiogroup" aria-label="Pickup time" className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
              {usable.slice(0, 24).map((s) => {
                const full = s.remaining === 0;
                const selected = s.at === slot;
                const fill = 1 - s.remaining / s.capacity;
                return (
                  <button
                    key={s.at}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={full}
                    onClick={() => setSlot(s.at)}
                    className={`relative overflow-hidden border-[3px] border-ink px-2 pt-2 pb-3 text-left transition-transform disabled:cursor-not-allowed disabled:bg-steel disabled:text-muted ${
                      selected ? "-translate-y-0.5 bg-turmeric shadow-hard" : "bg-paper hover:-translate-y-0.5"
                    }`}
                  >
                    <span className="nums block font-black">{s.label}</span>
                    <span className="block text-xs">{full ? "Full" : `${s.remaining} left`}</span>
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-ink/10">
                      <span className={`block h-full ${fill > 0.8 ? "bg-chilli" : "bg-leaf"}`} style={{ width: `${fill * 100}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="pay-h" className="panel p-5 sm:p-6">
          <h2 id="pay-h" className="text-xl font-black">How will you pay?</h2>
          <div role="radiogroup" aria-label="Payment method" className="mt-4 grid gap-3 sm:grid-cols-2">
            <PayOption selected={method === "WALLET"} onSelect={() => setMethod("WALLET")} title="Canteen wallet">
              Balance <span className="nums font-bold">{rupees(walletPaise)}</span>
              {walletPaise < total && <span className="block text-chilli font-bold">Not enough for this order</span>}
            </PayOption>
            <PayOption selected={method === "UPI"} onSelect={() => setMethod("UPI")} title="UPI">
              GPay, PhonePe, Paytm or any UPI app
            </PayOption>
          </div>
          {short && (
            <p className="mt-3 text-sm">
              <Link href="/wallet" className="font-bold underline decoration-2 underline-offset-4">Top up your wallet</Link> or switch to UPI.
            </p>
          )}
          <label className="label mt-6" htmlFor="note">Note for the kitchen <span className="font-medium text-muted">(optional)</span></label>
          <input id="note" className="field" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Less spicy, no onion, parcel…" />
        </section>
      </div>

      <aside className="lg:pt-[4.6rem]">
        <div className="panel sticky top-28">
          <h2 className="border-b-[3px] border-ink px-5 py-3 text-xl font-black">Bill</h2>
          <ul className="divide-y-2 divide-dashed divide-ink">
            {lines.map((l) => {
              const bad = problems.includes(l);
              return (
                <li key={l.id} className={`flex items-center gap-3 px-5 py-3 ${bad ? "bg-chilli-soft" : ""}`}>
                  <DietMark veg={l.isVeg} size={14} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{l.name}</p>
                    {bad ? (
                      <p className="text-xs font-bold">
                        {!l.live || !l.live.isAvailable || l.live.stock === 0 ? "Sold out. Remove it to continue." : `Only ${l.live.stock} left.`}
                      </p>
                    ) : (
                      <p className="nums text-sm text-muted">{rupees((l.live?.pricePaise ?? l.pricePaise) * l.qty)}</p>
                    )}
                  </div>
                  <Stepper qty={l.qty} label={l.name} onChange={(n) => cart.setQty(l.id, n)} />
                </li>
              );
            })}
          </ul>
          <dl className="nums space-y-1 border-t-[3px] border-ink px-5 py-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupees(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>GST {taxBasisPoints / 100}%</dt><dd>{rupees(tax)}</dd></div>
            <div className="flex items-baseline justify-between pt-2">
              <dt className="text-base font-black">Total</dt>
              <dd className="display text-3xl">{rupees(total)}</dd>
            </div>
          </dl>
          <div className="space-y-3 border-t-[3px] border-ink p-5">
            {error && <p role="alert" className="border-[3px] border-ink bg-chilli-soft px-3 py-2 text-sm font-bold">{error}</p>}
            <button
              className="btn btn-primary btn-lg w-full"
              disabled={blocked}
              onClick={() => (method === "UPI" ? setUpiOpen(true) : submit())}
            >
              {pending ? "Placing order…" : chosen ? `Pay ${rupees(total)} for ${chosen.label}` : "Pick a pickup time"}
            </button>
            <p className="text-xs text-muted">You can cancel for a full refund until the kitchen starts cooking.</p>
          </div>
        </div>
      </aside>

      <UpiSheet
        open={upiOpen}
        amountPaise={total}
        onApprove={() => {
          setUpiOpen(false);
          submit();
        }}
        onCancel={(reason) => {
          setUpiOpen(false);
          if (reason === "declined") setError("Payment declined in your UPI app. Nothing was charged.");
        }}
      />
    </div>
  );
}

function PayOption({ selected, onSelect, title, children }: { selected: boolean; onSelect: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-start gap-3 border-[3px] border-ink p-4 text-left ${selected ? "bg-turmeric-soft shadow-hard" : "bg-paper"}`}
    >
      <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[3px] border-ink ${selected ? "bg-ink" : "bg-paper"}`}>
        {selected && <span className="size-1.5 rounded-full bg-turmeric" />}
      </span>
      <span>
        <span className="block font-black">{title}</span>
        <span className="block text-sm text-muted">{children}</span>
      </span>
    </button>
  );
}
