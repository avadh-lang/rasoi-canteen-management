"use client";

import { useState, useTransition } from "react";
import { counterTopUp } from "@/app/actions/staff";
import { WalletLookup, type Account } from "@/components/wallet-lookup";
import { rupees } from "@/lib/money";

const PRESETS = [100, 200, 500, 1000];

export default function CounterWalletPage() {
  const [account, setAccount] = useState<{ a: Account; query: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const value = Number(amount);

  return (
    <div className="max-w-xl">
      <title>Wallet top-up · Rasoi</title>
      <h1 className="display mb-2 text-4xl sm:text-5xl">Wallet top-up</h1>
      <p className="mb-6 text-muted">Take cash, add it to the student&rsquo;s canteen wallet.</p>

      <div className="panel space-y-5 p-5 sm:p-6">
        <WalletLookup
          account={account?.a ?? null}
          onFound={(a, query) => { setAccount({ a, query }); setMsg(null); }}
          onClear={() => setAccount(null)}
        />
        {account && (
          <>
            <div>
              <span className="label">Cash received</span>
              <div className="mb-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p} type="button" aria-pressed={value === p} onClick={() => setAmount(String(p))} className="chip nums px-3 py-1 text-sm aria-pressed:bg-turmeric">
                    ₹{p}
                  </button>
                ))}
              </div>
              <label className="sr-only" htmlFor="amt">Amount in rupees</label>
              <input id="amt" className="field nums" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Amount in ₹" />
            </div>
            {msg && (
              <p role={msg.ok ? "status" : "alert"} className={`border-[3px] border-ink px-3 py-2 font-bold ${msg.ok ? "bg-leaf-soft" : "bg-chilli-soft"}`}>{msg.text}</p>
            )}
            <button
              className="btn btn-primary btn-lg w-full"
              disabled={pending || !(value > 0)}
              onClick={() =>
                start(async () => {
                  const r = await counterTopUp({ query: account.query, amount: value });
                  if (r.ok) {
                    setMsg({ ok: true, text: `Added ${rupees(value * 100)} for ${r.name}. New balance ${rupees(r.balance)}.` });
                    setAccount({ ...account, a: { ...account.a, walletBalance: r.balance } });
                    setAmount("");
                  } else setMsg({ ok: false, text: r.message });
                })
              }
            >
              {pending ? "Adding…" : value > 0 ? `Add ${rupees(value * 100)} to wallet` : "Enter the cash amount"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
