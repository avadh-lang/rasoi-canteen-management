import type { Metadata } from "next";
import { PageTitle } from "@/components/app-shell";
import { LiveRefresh } from "@/components/live-refresh";
import { db } from "@/lib/db";
import { businessDate, minutesSince, timeLabel } from "@/lib/domain/time";
import { rupees } from "@/lib/money";
import { HandOver } from "./hand-over";

export const metadata: Metadata = { title: "Pickup" };

export default async function PickupPage() {
  const now = new Date();
  const today = businessDate(now);
  const [ready, cooking, recent] = await Promise.all([
    db.order.findMany({ where: { businessDate: today, status: "READY" }, orderBy: { readyAt: "asc" }, include: { items: true } }),
    db.order.findMany({ where: { businessDate: today, status: { in: ["PLACED", "PREPARING"] } }, orderBy: { placedAt: "asc" }, select: { id: true, token: true, status: true } }),
    db.order.findMany({ where: { businessDate: today, status: "COLLECTED" }, orderBy: { collectedAt: "desc" }, take: 8, select: { id: true, token: true, customerName: true, collectedAt: true, totalPaise: true } }),
  ]);

  return (
    <>
      <PageTitle title="Pickup counter" aside={<LiveRefresh everyMs={4000} />}>
        Match the token, hand over the food, tap handed over.
      </PageTitle>

      <section aria-labelledby="ready-h" className="mb-10">
        <h2 id="ready-h" className="mb-4 text-xl font-black">Ready now ({ready.length})</h2>
        {ready.length === 0 ? (
          <p className="panel p-6 font-bold">Nothing waiting. Tokens appear here the moment the kitchen marks them ready.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {ready.map((o) => {
              const waiting = minutesSince(o.readyAt ?? o.placedAt, now);
              return (
                <li key={o.id} className="flex flex-col border-[3px] border-ink bg-leaf-soft shadow-hard">
                  <div className="flex items-start justify-between border-b-[3px] border-ink px-4 py-3">
                    <p className="display nums text-5xl">{o.token}</p>
                    <span className={`chip nums ${waiting > 10 ? "bg-chilli" : ""}`}>{waiting} min</span>
                  </div>
                  <div className="flex-1 bg-paper px-4 py-3">
                    <p className="font-black">{o.customerName}</p>
                    <p className="text-sm text-muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                    <p className="mt-1 text-sm">{o.paymentStatus === "PAID" ? `Paid ${rupees(o.totalPaise)} by ${o.paymentMethod.toLowerCase()}` : "Unpaid"}</p>
                  </div>
                  <HandOver orderId={o.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="cook-h">
          <h2 id="cook-h" className="mb-3 text-xl font-black">Still cooking</h2>
          <div className="panel flex min-h-20 flex-wrap gap-2 p-4">
            {cooking.length === 0 && <p className="text-muted">Kitchen is clear.</p>}
            {cooking.map((o) => (
              <span key={o.id} className={`chip nums text-base ${o.status === "PREPARING" ? "bg-turmeric" : ""}`}>{o.token}</span>
            ))}
          </div>
        </section>
        <section aria-labelledby="done-h">
          <h2 id="done-h" className="mb-3 text-xl font-black">Recently handed over</h2>
          <ul className="panel divide-y-2 divide-ink/15">
            {recent.length === 0 && <li className="p-4 text-muted">None yet today.</li>}
            {recent.map((o) => (
              <li key={o.id} className="nums flex justify-between px-4 py-2 text-sm">
                <span><span className="font-black">#{o.token}</span> {o.customerName}</span>
                <span>{o.collectedAt ? timeLabel(o.collectedAt) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
