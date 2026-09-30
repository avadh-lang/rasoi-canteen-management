"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { counterSale } from "@/app/actions/staff";
import { DietMark } from "@/components/marks";
import { TokenStub } from "@/components/token-stub";
import { WalletLookup, type Account } from "@/components/wallet-lookup";
import type { PaymentMethod } from "@/lib/domain/constants";
import { taxFor } from "@/lib/domain/pricing";
import { rupees } from "@/lib/money";

type Item = { id: string; name: string; pricePaise: number; isVeg: boolean; available: boolean; stock: number | null };
type Category = { id: string; name: string; items: Item[] };
type Line = { item: Item; qty: number };

export function Pos({ categories, taxBasisPoints }: { categories: Category[]; taxBasisPoints: number }) {
  const router = useRouter();
  const [tab, setTab] = useState(categories[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [customer, setCustomer] = useState("");
  const [account, setAccount] = useState<{ a: Account; query: string } | null>(null);
  const [tendered, setTendered] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ token: number; handedOver: boolean } | null>(null);
  const [pending, start] = useTransition();

  const subtotal = lines.reduce((a, l) => a + l.item.pricePaise * l.qty, 0);
  const tax = taxFor(subtotal, taxBasisPoints);
  const total = subtotal + tax;
  const cashGiven = Math.round(Number(tendered || 0) * 100);
  const change = cashGiven - total;

  const add = (item: Item) => {
    setIssued(null);
    setLines((prev) => {
      const found = prev.find((l) => l.item.id === item.id);
      if (found) return prev.map((l) => (l.item.id === item.id ? { ...l, qty: Math.min(20, l.qty + 1) } : l));
      return [...prev, { item, qty: 1 }];
    });
  };
  const setQty = (id: string, qty: number) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.item.id !== id) : prev.map((l) => (l.item.id === id ? { ...l, qty } : l))));

  const blocked =
    pending ||
    lines.length === 0 ||
    (method === "WALLET" && (!account || account.a.walletBalance < total)) ||
    (method === "CASH" && tendered !== "" && change < 0);

  function charge() {
    setError(null);
    start(async () => {
      const r = await counterSale({
        lines: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty })),
        paymentMethod: method,
        customerName: customer,
        walletLookup: account?.query ?? "",
        note: "",
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setIssued({ token: r.token, handedOver: r.status === "COLLECTED" });
      setLines([]);
      setCustomer("");
      setAccount(null);
      setTendered("");
      router.refresh();
    });
  }

  const current = categories.find((c) => c.id === tab);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="min-w-0">
        <h1 className="display mb-4 text-4xl">Counter billing</h1>
        <div role="tablist" aria-label="Menu sections" className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={c.id === tab}
              onClick={() => setTab(c.id)}
              className="chip px-3 py-1.5 text-sm aria-selected:bg-ink aria-selected:text-paper"
            >
              {c.name}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {current?.items.map((item) => {
            const inBill = lines.find((l) => l.item.id === item.id)?.qty ?? 0;
            return (
              <button
                key={item.id}
                disabled={!item.available}
                onClick={() => add(item)}
                className={`relative flex min-h-24 flex-col justify-between border-[3px] border-ink p-3 text-left shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-steel disabled:text-muted disabled:shadow-none ${
                  inBill ? "bg-turmeric" : "bg-paper"
                }`}
              >
                <span className="flex items-start gap-1.5 font-bold leading-tight">
                  <span className="mt-0.5"><DietMark veg={item.isVeg} size={13} /></span>
                  {item.name}
                </span>
                <span className="nums flex items-end justify-between">
                  <span className="font-black">{rupees(item.pricePaise)}</span>
                  <span className="text-xs">{!item.available ? "Sold out" : item.stock !== null ? `${item.stock} left` : ""}</span>
                </span>
                {inBill > 0 && (
                  <span className="nums absolute -top-2.5 -right-2.5 grid size-7 place-items-center rounded-full border-[3px] border-ink bg-paper text-sm font-black">{inBill}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="panel self-start lg:sticky lg:top-28">
        <div className="flex items-center justify-between border-b-[3px] border-ink px-4 py-3">
          <h2 className="text-xl font-black">Bill</h2>
          {lines.length > 0 && <button className="text-sm font-bold underline" onClick={() => setLines([])}>Clear</button>}
        </div>

        {issued && lines.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <TokenStub token={issued.token} status={issued.handedOver ? "COLLECTED" : "PLACED"} size="sm" animate caption={issued.handedOver ? "Handed over" : "Sent to kitchen"} />
            <p className="font-bold">{issued.handedOver ? "Packaged items. Hand them over now." : `Call out token ${issued.token} when it's ready.`}</p>
          </div>
        ) : lines.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted">Tap items on the left to start a bill.</p>
        ) : (
          <ul className="max-h-72 divide-y-2 divide-dashed divide-ink overflow-y-auto">
            {lines.map((l) => (
              <li key={l.item.id} className="flex items-center gap-2 px-4 py-2">
                <span className="min-w-0 flex-1 truncate font-bold">{l.item.name}</span>
                <div className="flex items-center">
                  <button className="size-8 border-2 border-ink font-black" onClick={() => setQty(l.item.id, l.qty - 1)} aria-label={`One less ${l.item.name}`}>−</button>
                  <span className="nums w-8 text-center font-black">{l.qty}</span>
                  <button className="size-8 border-2 border-ink font-black" onClick={() => setQty(l.item.id, l.qty + 1)} aria-label={`One more ${l.item.name}`}>+</button>
                </div>
                <span className="nums w-16 text-right">{rupees(l.item.pricePaise * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="nums space-y-1 border-t-[3px] border-ink px-4 py-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupees(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>GST {taxBasisPoints / 100}%</dt><dd>{rupees(tax)}</dd></div>
          <div className="flex items-baseline justify-between"><dt className="text-base font-black">Total</dt><dd className="display text-3xl">{rupees(total)}</dd></div>
        </dl>

        <div className="space-y-4 border-t-[3px] border-ink p-4">
          <div role="radiogroup" aria-label="Payment" className="grid grid-cols-3 border-[3px] border-ink">
            {(["CASH", "UPI", "WALLET"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className="border-ink py-2 font-black not-last:border-r-[3px] aria-checked:bg-turmeric"
              >
                {m === "CASH" ? "Cash" : m === "UPI" ? "UPI" : "Wallet"}
              </button>
            ))}
          </div>

          {method === "WALLET" ? (
            <>
              <WalletLookup account={account?.a ?? null} onFound={(a, query) => setAccount({ a, query })} onClear={() => setAccount(null)} />
              {account && account.a.walletBalance < total && <p className="text-sm font-bold text-chilli">Balance too low for this bill.</p>}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="cust">Name <span className="font-medium text-muted">(optional)</span></label>
                <input id="cust" className="field" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" />
              </div>
              {method === "CASH" && (
                <div>
                  <label className="label" htmlFor="tendered">Cash given</label>
                  <input id="tendered" className="field nums" inputMode="decimal" value={tendered} onChange={(e) => setTendered(e.target.value.replace(/[^\d.]/g, ""))} placeholder="₹" />
                  {tendered && <p className={`nums mt-1 text-sm font-bold ${change < 0 ? "text-chilli" : ""}`}>{change < 0 ? `Short by ${rupees(-change)}` : `Change ${rupees(change)}`}</p>}
                </div>
              )}
            </div>
          )}

          {error && <p role="alert" className="border-[3px] border-ink bg-chilli-soft px-3 py-2 text-sm font-bold">{error}</p>}
          <button className="btn btn-primary btn-lg w-full" disabled={blocked} onClick={charge}>
            {pending ? "Charging…" : `Charge ${rupees(total)}`}
          </button>
        </div>
      </aside>
    </div>
  );
}
