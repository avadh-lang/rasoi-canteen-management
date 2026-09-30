"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelMyOrder } from "@/app/actions/customer";
import { rupees } from "@/lib/money";

export function CancelOrderButton({ orderId, totalPaise, group = false }: { orderId: string; totalPaise: number; group?: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button className="btn btn-sm" onClick={() => setConfirming(true)}>
        Cancel order
      </button>
    );
  }
  return (
    <div className="space-y-3 border-[3px] border-ink bg-chilli-soft p-4">
      <p className="font-bold">{group ? "Cancel for the whole table? Everyone gets their own share back in their wallet straight away." : `Cancel this order? ${rupees(totalPaise)} goes back to your wallet straight away.`}</p>
      {error && <p role="alert" className="text-sm font-bold">{error}</p>}
      <div className="flex gap-3">
        <button
          className="btn btn-danger btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelMyOrder(orderId);
              if (!r.ok) setError(r.message);
              else setConfirming(false);
              router.refresh();
            })
          }
        >
          {pending ? "Cancelling…" : "Cancel order"}
        </button>
        <button className="btn btn-sm" onClick={() => setConfirming(false)} disabled={pending}>
          Keep order
        </button>
      </div>
    </div>
  );
}
