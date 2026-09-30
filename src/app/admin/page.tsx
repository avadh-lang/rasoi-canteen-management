import type { Metadata } from "next";
import Link from "next/link";
import { ColumnChart, MixBar, RankBars } from "@/components/charts";
import { LiveRefresh } from "@/components/live-refresh";
import { businessDate, minuteLabel, timeLabel } from "@/lib/domain/time";
import { rupees } from "@/lib/money";
import { dashboard } from "@/server/analytics";

export const metadata: Metadata = { title: "Overview" };

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const compact = (paise: number) => (paise >= 100_000_00 ? `₹${(paise / 100_000_00).toFixed(1)}L` : paise >= 1000_00 ? `₹${(paise / 1000_00).toFixed(1)}k` : rupees(paise));

export default async function AdminHome() {
  const d = await dashboard();
  const today = businessDate();
  const weekRevenue = d.byDay.reduce((a, x) => a + x.revenue, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-bold">{longDay.format(new Date(`${today}T00:00:00Z`))}</p>
          <h1 className="display text-4xl sm:text-5xl">Today at the canteen</h1>
        </div>
        <div className="flex items-center gap-3">
          <LiveRefresh everyMs={15000} />
          <a href={`/api/admin/export?from=${d.byDay[0].key}&to=${today}`} className="btn btn-sm">Download 7-day CSV</a>
        </div>
      </div>

      {/* Headline numbers */}
      <section aria-label="Today's numbers" className="grid grid-cols-2 gap-[3px] border-[3px] border-ink bg-ink shadow-hard md:grid-cols-4">
        <Stat label="Sales today" value={rupees(d.today.revenue)} note={`${d.today.orders} orders, ${d.today.online} online`} strong />
        <Stat label="Average bill" value={rupees(d.today.avgTicket)} note={d.today.cancelled ? `${d.today.cancelled} cancelled` : "No cancellations"} />
        <Stat label="Open orders" value={String(d.today.active)} note={<Link href="/kitchen" className="underline decoration-2 underline-offset-2">See the board</Link>} />
        <Stat label="Order to ready" value={d.today.avgPrep === null ? "–" : `${Math.round(d.today.avgPrep)} min`} note="Average today" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5" aria-labelledby="week-h">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="week-h" className="text-lg font-black">Sales, last 7 days</h2>
            <p className="nums text-sm"><span className="font-black">{rupees(weekRevenue)}</span> total</p>
          </div>
          <ColumnChart
            title="Sales by day"
            bars={d.byDay.map((x) => ({
              label: x.key === today ? "Today" : dayFmt.format(new Date(`${x.key}T00:00:00Z`)),
              value: x.revenue,
              display: compact(x.revenue),
              detail: `${longDay.format(new Date(`${x.key}T00:00:00Z`))}, ${x.orders} orders`,
              highlight: x.key === today,
            }))}
          />
        </section>

        <section className="panel p-5" aria-labelledby="pay-h">
          <h2 id="pay-h" className="mb-5 text-lg font-black">How people paid this week</h2>
          <MixBar
            parts={d.payments.map((p) => ({
              label: p.method === "WALLET" ? "Canteen wallet" : p.method === "UPI" ? "UPI" : "Cash",
              value: p.revenue,
              display: rupees(p.revenue),
            }))}
          />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5" aria-labelledby="hour-h">
          <h2 id="hour-h" className="mb-5 text-lg font-black">Orders by hour, today</h2>
          <ColumnChart
            title="Orders by hour today"
            height={150}
            labelEvery={2}
            bars={d.busyHours.map((h) => ({
              label: minuteLabel(h.hour * 60).replace(":00 ", ""),
              value: h.orders,
              display: `${h.orders}`,
              detail: `${minuteLabel(h.hour * 60)} to ${minuteLabel(h.hour * 60 + 59)}`,
            }))}
          />
        </section>

        <section className="panel p-5" aria-labelledby="top-h">
          <h2 id="top-h" className="mb-5 text-lg font-black">Best sellers this week</h2>
          <RankBars rows={d.topItems.map((i) => ({ label: i.name, value: i.qty, display: `${i.qty} sold`, sub: compact(i.revenue) }))} />
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel" aria-labelledby="stock-h">
          <div className="flex items-baseline justify-between border-b-[3px] border-ink px-5 py-3">
            <h2 id="stock-h" className="text-lg font-black">Running low</h2>
            <Link href="/admin/menu" className="text-sm font-bold underline decoration-2 underline-offset-4">Restock</Link>
          </div>
          {d.lowStock.length === 0 ? (
            <p className="p-5 text-muted">Everything has more than 10 left.</p>
          ) : (
            <ul className="divide-y-2 divide-ink/15">
              {d.lowStock.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-5 py-2.5">
                  <span className="font-bold">{i.name}</span>
                  <span className={`chip nums ${i.stock === 0 ? "bg-chilli" : "bg-chilli-soft"}`}>{i.stock === 0 ? "Sold out" : `${i.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="log-h">
          <h2 id="log-h" className="border-b-[3px] border-ink px-5 py-3 text-lg font-black">Recent activity</h2>
          <ul className="divide-y-2 divide-ink/15 text-sm">
            {d.activity.map((a) => (
              <li key={a.id} className="grid grid-cols-[4.5rem_1fr] gap-3 px-5 py-2">
                <span className="nums text-muted">{timeLabel(a.createdAt)}</span>
                <span>
                  <span className="font-bold">{a.actor?.name ?? "System"}</span> {describe(a.action)} <span className="text-muted">{a.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, note, strong }: { label: string; value: string; note: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`p-5 ${strong ? "bg-turmeric" : "bg-paper"}`}>
      <p className="text-sm font-bold">{label}</p>
      <p className="display nums mt-1 text-3xl sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm">{note}</p>
    </div>
  );
}

const VERBS: Record<string, string> = {
  "order.placed": "placed an order",
  "order.preparing": "started cooking",
  "order.ready": "marked ready",
  "order.collected": "handed over",
  "order.cancelled": "cancelled",
  "wallet.topup": "topped up a wallet",
  "menu.created": "added a dish",
  "menu.updated": "edited a dish",
  "menu.enabled": "put back on the menu",
  "menu.disabled": "took off the menu",
  "menu.restocked": "restocked",
  "category.created": "added a menu section",
  "user.created": "added a person",
  "user.updated": "changed a person",
  "settings.updated": "changed settings",
  "auth.login": "signed in",
  "auth.register": "created an account",
  "system.seeded": "loaded demo data",
};
function describe(action: string) {
  return VERBS[action] ?? action;
}
