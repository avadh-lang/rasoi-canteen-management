"use client";

import { useState, useTransition } from "react";
import { lookupWallet } from "@/app/actions/staff";
import { rupees } from "@/lib/money";

export type Account = { id: string; name: string; rollNo: string | null; email: string; walletBalance: number };

export function WalletLookup({
  account,
  onFound,
  onClear,
}: {
  account: Account | null;
  onFound: (a: Account, query: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (account) {
    return (
      <div className="flex items-center justify-between gap-3 border-[3px] border-ink bg-leaf-soft px-3 py-2">
        <div>
          <p className="font-black">{account.name}</p>
          <p className="nums text-sm">{account.rollNo ?? account.email}, balance {rupees(account.walletBalance)}</p>
        </div>
        <button type="button" className="btn btn-sm" onClick={onClear}>Change</button>
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await lookupWallet(query);
          if (r.ok) onFound(r.account, query);
          else setError(r.message);
        });
      }}
    >
      <label className="label" htmlFor="wallet-q">Student roll no. or email</label>
      <div className="flex gap-2">
        <input id="wallet-q" className="field uppercase" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="22CE1001" autoComplete="off" />
        <button className="btn" disabled={pending || !query.trim()}>{pending ? "Finding…" : "Find"}</button>
      </div>
      {error && <p role="alert" className="text-sm font-bold text-chilli">{error}</p>}
    </form>
  );
}
