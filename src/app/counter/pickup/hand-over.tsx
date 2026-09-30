"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveOrder } from "@/app/actions/staff";

export function HandOver({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="border-t-[3px] border-ink p-3">
      {error && <p role="alert" className="mb-2 text-sm font-bold text-chilli">{error}</p>}
      <button
        className="btn btn-ink w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await moveOrder(orderId, "COLLECTED");
            if (!r.ok) setError(r.message);
            router.refresh();
          })
        }
      >
        {pending ? "Saving…" : "Handed over"}
      </button>
    </div>
  );
}
