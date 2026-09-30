import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/app-shell";
import { TokenStub } from "@/components/token-stub";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATUS_LABEL, type OrderStatus } from "@/lib/domain/constants";
import { isTerminal } from "@/lib/domain/order-state";
import { timeLabel } from "@/lib/domain/time";
import { rupees } from "@/lib/money";

export const metadata: Metadata = { title: "My orders" };

const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function OrdersPage() {
  const user = await requireUser("CUSTOMER");
  const orders = await db.order.findMany({
    where: { OR: [{ userId: user.id }, { group: { members: { some: { userId: user.id } } } }] },
    orderBy: { placedAt: "desc" },
    take: 50,
    include: { items: { select: { name: true, qty: true } } },
  });
  const active = orders.filter((o) => !isTerminal(o.status as OrderStatus));
  const past = orders.filter((o) => isTerminal(o.status as OrderStatus));

  return (
    <>
      <PageTitle title="My orders" />
      {orders.length === 0 && (
        <div className="panel max-w-md p-8">
          <p className="font-extrabold">No orders yet.</p>
          <p className="mt-1 text-muted">Your tokens and receipts will show up here.</p>
          <Link href="/menu" className="btn btn-primary mt-5">Browse the menu</Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-10" aria-labelledby="active-h">
          <h2 id="active-h" className="mb-4 text-xl font-black">In progress</h2>
          <ul className="flex flex-wrap gap-8 px-3">
            {active.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="block transition-transform hover:-translate-y-1" aria-label={`Token ${o.token}, ${STATUS_LABEL[o.status as OrderStatus]}`}>
                  <TokenStub size="sm" token={o.token} status={o.status as OrderStatus} caption={STATUS_LABEL[o.status as OrderStatus]} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-h">
          <h2 id="past-h" className="mb-4 text-xl font-black">Past orders</h2>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b-[3px] border-ink bg-steel/50">
                <tr>
                  <th className="px-4 py-2.5">Token</th>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Items</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/15">
                {past.map((o) => (
                  <tr key={o.id} className="hover:bg-turmeric-soft/60">
                    <td className="px-4 py-2.5">
                      <Link href={`/orders/${o.id}`} className="nums font-black underline decoration-2 underline-offset-4">#{o.token}</Link>
                    </td>
                    <td className="nums px-4 py-2.5 whitespace-nowrap">{dateFmt.format(o.placedAt)}, {timeLabel(o.placedAt)}</td>
                    <td className="max-w-xs truncate px-4 py-2.5">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                    <td className="px-4 py-2.5">
                      <span className={`chip ${o.status === "CANCELLED" ? "bg-chilli-soft" : ""}`}>{STATUS_LABEL[o.status as OrderStatus]}</span>
                    </td>
                    <td className="nums px-4 py-2.5 text-right font-bold">{rupees(o.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
