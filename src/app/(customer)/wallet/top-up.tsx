"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { topUpMyWallet } from "@/app/actions/customer";
import { UpiSheet } from "@/components/upi-sheet";
import { rupees } from "@/lib/money";

const PRESETS = [100, 200, 500, 1000];

export function TopUp({ min, max }: { min: number; max: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("200");
  const [upi, setUpi] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= min && value <= max;

  return (
    <section className="panel space-y-4 p-5" aria-labelledby="topup-h">
      <h2 id="topup-h" className="text-xl font-black">Add money</h2>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            aria-pressed={value === p}
            className="chip nums px-3 py-1 text-sm aria-pressed:bg-turmeric"
          >
            ₹{p}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="amount">Amount in rupees</label>
        <input id="amount" className="field nums" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
        <p className="mt-1 text-xs text-muted">Between ₹{min} and ₹{max}.</p>
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`border-[3px] border-ink px-3 py-2 text-sm font-bold ${msg.ok ? "bg-leaf-soft" : "bg-chilli-soft"}`}>
          {msg.text}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={!valid || pending} onClick={() => { setMsg(null); setUpi(true); }}>
        {pending ? "Adding…" : valid ? `Add ${rupees(value * 100)} by UPI` : "Enter an amount"}
      </button>
      <UpiSheet
        open={upi}
        amountPaise={Math.round(value * 100) || 0}
        onCancel={(reason) => {
          setUpi(false);
          if (reason === "declined") setMsg({ ok: false, text: "Payment declined in your UPI app. Nothing was added." });
        }}
        onApprove={() => {
          setUpi(false);
          start(async () => {
            const r = await topUpMyWallet({ amount: value });
            setMsg(r.ok ? { ok: true, text: `Added. New balance ${rupees(r.balance)}.` } : { ok: false, text: r.message });
            router.refresh();
          });
        }}
      />
    </section>
  );
}
