"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveOrder } from "@/app/actions/staff";
import type { OrderStatus } from "@/lib/domain/constants";

const PRIMARY: Partial<Record<OrderStatus, { to: OrderStatus; label: string; className: string }>> = {
  PLACED: { to: "PREPARING", label: "Start cooking", className: "btn btn-primary" },
  PREPARING: { to: "READY", label: "Mark ready", className: "btn btn-go" },
  READY: { to: "COLLECTED", label: "Handed over", className: "btn btn-ink" },
};

export function TicketActions({ orderId, status, token }: { orderId: string; status: OrderStatus; token: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const primary = PRIMARY[status];

  const run = (to: OrderStatus) =>
    start(async () => {
      setError(null);
      const r = await moveOrder(orderId, to);
      if (!r.ok) setError(r.message);
      setConfirmCancel(false);
      router.refresh();
    });

  return (
    <div className="space-y-2 px-4 py-3">
      {error && <p role="alert" className="border-2 border-ink bg-chilli-soft px-2 py-1 text-sm font-bold">{error}</p>}
      {confirmCancel ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">Cancel #{token} and refund?</span>
          <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => run("CANCELLED")}>Cancel order</button>
          <button className="btn btn-sm" disabled={pending} onClick={() => setConfirmCancel(false)}>Keep</button>
        </div>
      ) : (
        <div className="flex gap-2">
          {primary && (
            <button className={`${primary.className} flex-1`} disabled={pending} onClick={() => run(primary.to)}>
              {pending ? "Saving…" : primary.label}
            </button>
          )}
          {status !== "READY" && (
            <button className="btn btn-sm self-center" disabled={pending} onClick={() => setConfirmCancel(true)} aria-label={`Cancel order ${token}`}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
