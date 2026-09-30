"use client";

import { useEffect, useRef, useState } from "react";
import { rupees } from "@/lib/money";

/**
 * Simulated UPI collect request. In production this is where a gateway
 * (Razorpay / PhonePe PG) would hand off to the student's UPI app; here the
 * approve and decline buttons stand in for the phone.
 */
export function UpiSheet({
  open,
  amountPaise,
  payee = "rasoi.vcet@okaxis",
  onApprove,
  onCancel,
}: {
  open: boolean;
  amountPaise: number;
  payee?: string;
  onApprove: () => void;
  onCancel: (reason: "declined" | "closed") => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<"waiting" | "approving">("waiting");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setPhase("waiting");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  function approve() {
    setPhase("approving");
    window.setTimeout(onApprove, 900);
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel("closed");
      }}
      className="m-auto w-[min(92vw,380px)] border-[3px] border-ink bg-paper p-0 shadow-hard-lg backdrop:bg-ink/50"
      aria-labelledby="upi-title"
    >
      <div className="border-b-[3px] border-ink bg-ink px-5 py-3 text-paper">
        <h2 id="upi-title" className="font-black">Pay by UPI</h2>
        <p className="text-sm opacity-80">Demo payment. No real money moves.</p>
      </div>
      <div className="space-y-4 p-5 text-center">
        <QrPattern seed={amountPaise} />
        <div>
          <p className="text-sm text-muted">Paying {payee}</p>
          <p className="display nums text-4xl">{rupees(amountPaise)}</p>
        </div>
        <p className="text-sm font-bold" aria-live="polite">
          {phase === "waiting" ? "Scan the code or approve the request in your UPI app." : "Confirming with your bank…"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn" onClick={() => onCancel("declined")} disabled={phase === "approving"}>
            Decline
          </button>
          <button className="btn btn-go" onClick={approve} disabled={phase === "approving"} autoFocus>
            {phase === "approving" ? "Approving…" : "Approve"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** A deterministic QR-looking grid, drawn from the amount. Decorative only. */
function QrPattern({ seed }: { seed: number }) {
  const n = 21;
  let s = seed || 7;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    cells.push(s % 3 === 0);
  }
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      const dx = x - fx, dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
        const ring = Math.min(dx, dy, 6 - dx, 6 - dy);
        return ring !== 1;
      }
    }
    return null;
  };
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="mx-auto size-40 border-[3px] border-ink bg-paper p-1.5" aria-hidden shapeRendering="crispEdges">
      {cells.map((on, i) => {
        const x = i % n, y = Math.floor(i / n);
        const f = finder(x, y);
        return (f ?? on) ? <rect key={i} x={x} y={y} width={1} height={1} /> : null;
      })}
    </svg>
  );
}
