import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/app-shell";
import { db } from "@/lib/db";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/domain/constants";
import { businessDate, timeLabel } from "@/lib/domain/time";
import { rupees } from "@/lib/money";

export const metadata: Metadata = { title: "Orders" };

const PAGE = 40;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; channel?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : businessDate();
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const channel = sp.channel === "ONLINE" || sp.channel === "COUNTER" ? sp.channel : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where = { businessDate: date, ...(status && { status }), ...(channel && { channel }) };
  const [orders, count, sum] = await Promise.all([
    db.order.findMany({ where, orderBy: { token: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { items: { select: { name: true, qty: true } } } }),
    db.order.count({ where }),
    db.order.aggregate({ where: { ...where, status: status ?? { not: "CANCELLED" } }, _sum: { totalPaise: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const link = (p: number) => `/admin/orders?${new URLSearchParams({ date, ...(status && { status }), ...(channel && { channel }), page: String(p) })}`;

  return (
    <>
      <PageTitle
        title="Orders"
        aside={<a className="btn btn-sm" href={`/api/admin/export?from=${date}&to=${date}`}>Download CSV for this day</a>}
      >
        {count} orders, {rupees(sum._sum.totalPaise ?? 0)} in sales{status ? "" : " (excluding cancellations)"}.
      </PageTitle>

      <form className="mb-6 flex flex-wrap items-end gap-3 border-[3px] border-ink bg-paper p-4">
        <div>
          <label className="label" htmlFor="date">Day</label>
          <input id="date" name="date" type="date" className="field nums" defaultValue={date} max={businessDate()} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="field" defaultValue={status ?? ""}>
            <option value="">Any</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="channel">Channel</label>
          <select id="channel" name="channel" className="field" defaultValue={channel ?? ""}>
            <option value="">Both</option>
            <option value="ONLINE">Online</option>
            <option value="COUNTER">Counter</option>
          </select>
        </div>
        <button className="btn btn-ink">Show orders</button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b-[3px] border-ink bg-steel/40">
            <tr>
              <th className="px-4 py-2.5">Token</th>
              <th className="px-4 py-2.5">Placed</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Items</th>
              <th className="px-4 py-2.5">Channel</th>
              <th className="px-4 py-2.5">Payment</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-ink/15">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="nums px-4 py-2 font-black">#{o.token}</td>
                <td className="nums px-4 py-2">{timeLabel(o.placedAt)}</td>
                <td className="px-4 py-2 font-bold">{o.customerName}</td>
                <td className="max-w-64 truncate px-4 py-2" title={o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}>
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                </td>
                <td className="px-4 py-2">{o.channel === "ONLINE" ? "Online" : "Counter"}</td>
                <td className="px-4 py-2">{o.paymentMethod === "WALLET" ? "Wallet" : o.paymentMethod === "UPI" ? "UPI" : "Cash"}{o.paymentStatus === "REFUNDED" && <span className="ml-1 chip bg-chilli-soft">Refunded</span>}</td>
                <td className="px-4 py-2"><span className={`chip ${o.status === "CANCELLED" ? "bg-chilli-soft" : o.status === "READY" ? "bg-leaf-soft" : o.status === "COLLECTED" ? "" : "bg-turmeric-soft"}`}>{STATUS_LABEL[o.status as OrderStatus]}</span></td>
                <td className="nums px-4 py-2 text-right font-bold">{rupees(o.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-6 text-center font-bold">No orders match these filters.</p>}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3">
          {page > 1 ? <Link className="btn btn-sm" href={link(page - 1)}>Newer</Link> : <span />}
          <span className="nums font-bold">Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-sm" href={link(page + 1)}>Older</Link>}
        </nav>
      )}
    </>
  );
}
