import type { Metadata } from "next";
import { LiveRefresh } from "@/components/live-refresh";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/lib/domain/constants";
import { businessDate, minutesSince, timeLabel } from "@/lib/domain/time";
import { TicketActions } from "./ticket-actions";

export const metadata: Metadata = { title: "Kitchen" };

const COLUMNS: { status: OrderStatus; title: string; empty: string; tone: string }[] = [
  { status: "PLACED", title: "New", empty: "No new orders.", tone: "bg-paper" },
  { status: "PREPARING", title: "Cooking", empty: "Nothing on the stove.", tone: "bg-turmeric-soft" },
  { status: "READY", title: "At the counter", empty: "Counter is clear.", tone: "bg-leaf-soft" },
];

export default async function KitchenPage() {
  const now = new Date();
  const orders = await db.order.findMany({
    where: { businessDate: businessDate(now), status: { in: ["PLACED", "PREPARING", "READY"] } },
    include: { items: { include: { menuItem: { select: { prepMinutes: true, isVeg: true } } } } },
    orderBy: [{ placedAt: "asc" }],
  });

  // What to cook next, summed across every order not yet ready.
  const tally = new Map<string, number>();
  for (const o of orders.filter((o) => o.status !== "READY"))
    for (const i of o.items) if (i.menuItem.prepMinutes > 0) tally.set(i.name, (tally.get(i.name) ?? 0) + i.qty);
  const tallyRows = [...tally].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-4xl sm:text-5xl">Order board</h1>
        <LiveRefresh everyMs={4000} />
      </div>

      {tallyRows.length > 0 && (
        <section aria-label="Items to cook" className="mb-6 flex flex-wrap items-center gap-2 border-[3px] border-ink bg-ink p-3 text-paper">
          <span className="mr-2 font-black">To cook</span>
          {tallyRows.map(([name, qty]) => (
            <span key={name} className="chip nums border-paper">
              <span className="font-black">{qty}×</span> {name}
            </span>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders
            .filter((o) => o.status === col.status)
            .sort((a, b) => (a.pickupSlot?.getTime() ?? a.placedAt.getTime()) - (b.pickupSlot?.getTime() ?? b.placedAt.getTime()));
          return (
            <section key={col.status} aria-labelledby={`col-${col.status}`} className="min-w-0">
              <h2 id={`col-${col.status}`} className="mb-3 flex items-baseline justify-between border-b-[3px] border-ink pb-1 text-xl font-black">
                {col.title}
                <span className="nums text-3xl">{list.length}</span>
              </h2>
              {list.length === 0 && <p className="border-[3px] border-dashed border-ink/40 p-6 text-center font-bold text-muted">{col.empty}</p>}
              <ul className="space-y-4">
                {list.map((o) => {
                  const prep = Math.max(0, ...o.items.map((i) => i.menuItem.prepMinutes));
                  const since = o.status === "PREPARING" && o.preparingAt ? o.preparingAt : o.status === "READY" && o.readyAt ? o.readyAt : o.placedAt;
                  const waited = minutesSince(since, now);
                  const late = o.status === "PREPARING" ? waited > prep + 5 : o.status === "PLACED" ? waited > 5 : waited > 15;
                  const dueSoon = o.pickupSlot && o.status !== "READY" && o.pickupSlot.getTime() - now.getTime() < prep * 60_000;
                  return (
                    <li key={o.id} className={`border-[3px] border-ink ${col.tone} shadow-hard`}>
                      <div className="flex items-start justify-between gap-2 border-b-[3px] border-ink px-4 py-2">
                        <div>
                          <p className="display nums text-4xl">{o.token}</p>
                          <p className="text-sm font-bold">{o.customerName}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className={`chip nums ${late ? "bg-chilli text-ink" : ""}`}>
                            {waited} min {o.status === "PLACED" ? "waiting" : o.status === "PREPARING" ? "cooking" : "at counter"}
                          </p>
                          <p className="mt-1 font-bold">
                            {o.channel === "COUNTER" ? "Counter order" : o.pickupSlot ? <>Pickup <span className={`nums ${dueSoon ? "bg-chilli-soft px-1" : ""}`}>{timeLabel(o.pickupSlot)}</span></> : "Online"}
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-0.5 px-4 py-3">
                        {o.items.map((i) => (
                          <li key={i.id} className="flex gap-2 text-lg">
                            <span className="nums w-8 font-black">{i.qty}×</span>
                            <span className={i.menuItem.prepMinutes === 0 ? "text-muted" : "font-bold"}>{i.name}</span>
                          </li>
                        ))}
                      </ul>
                      {o.note && <p className="mx-4 mb-3 border-2 border-ink bg-paper px-2 py-1 text-sm font-bold">Note: {o.note}</p>}
                      <div className="perforated-x mx-2 opacity-40" aria-hidden />
                      <TicketActions orderId={o.id} status={o.status as OrderStatus} token={o.token} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
