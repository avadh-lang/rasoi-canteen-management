import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveRefresh } from "@/components/live-refresh";
import { StatusTrack } from "@/components/status-track";
import { TokenStub } from "@/components/token-stub";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATUS_LABEL, type OrderStatus } from "@/lib/domain/constants";
import { isTerminal } from "@/lib/domain/order-state";
import { timeLabel } from "@/lib/domain/time";
import { rupees } from "@/lib/money";
import { CancelOrderButton } from "./cancel-button";

export const metadata: Metadata = { title: "Your token" };

const HEADLINE: Record<OrderStatus, string> = {
  PLACED: "Order received",
  PREPARING: "On the stove",
  READY: "Come and get it",
  COLLECTED: "Enjoy your meal",
  CANCELLED: "Order cancelled",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ id }, { placed }, user] = await Promise.all([params, searchParams, requireUser("CUSTOMER")]);
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.userId !== user.id) notFound();

  const status = order.status as OrderStatus;
  const live = !isTerminal(status);

  const detail: Record<OrderStatus, string> = {
    PLACED: `The kitchen has your order for ${order.pickupSlot ? timeLabel(order.pickupSlot) : "pickup"}. You can still cancel until they start cooking.`,
    PREPARING: "The cooks are on it. We'll turn your token green when it's at the counter.",
    READY: "Your food is waiting at the pickup counter. Show this token.",
    COLLECTED: `Collected at ${order.collectedAt ? timeLabel(order.collectedAt) : "the counter"}.`,
    CANCELLED:
      order.paymentStatus === "REFUNDED"
        ? order.paymentMethod === "CASH"
          ? "Collect your cash refund at the counter."
          : `${rupees(order.totalPaise)} is back in your wallet.`
        : "No payment was taken.",
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/orders" className="text-sm font-bold underline decoration-2 underline-offset-4">All orders</Link>
        {live && <LiveRefresh everyMs={4000} />}
      </div>

      <div className="grid items-start gap-10 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center px-4 pt-2 md:justify-start">
          <TokenStub
            token={order.token}
            status={status}
            animate={placed === "1"}
            caption={order.pickupSlot ? `Pickup ${timeLabel(order.pickupSlot)}` : undefined}
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="font-bold">{STATUS_LABEL[status]}</p>
            <h1 className="display mt-1 text-4xl sm:text-5xl">{HEADLINE[status]}</h1>
            <p className="mt-3 max-w-prose">{detail[status]}</p>
          </div>

          <StatusTrack
            status={status}
            times={{ PLACED: order.placedAt, PREPARING: order.preparingAt, READY: order.readyAt, COLLECTED: order.collectedAt }}
          />

          <section className="panel" aria-labelledby="items-h">
            <h2 id="items-h" className="border-b-[3px] border-ink px-5 py-3 font-black">
              {order.items.reduce((a, i) => a + i.qty, 0)} items, placed {timeLabel(order.placedAt)}
            </h2>
            <ul className="divide-y-2 divide-dashed divide-ink">
              {order.items.map((i) => (
                <li key={i.id} className="nums flex justify-between px-5 py-2.5">
                  <span><span className="font-black">{i.qty}×</span> {i.name}</span>
                  <span>{rupees(i.linePaise)}</span>
                </li>
              ))}
            </ul>
            <dl className="nums space-y-1 border-t-[3px] border-ink px-5 py-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupees(order.subtotalPaise)}</dd></div>
              <div className="flex justify-between"><dt>GST</dt><dd>{rupees(order.taxPaise)}</dd></div>
              <div className="flex justify-between text-base font-black"><dt>Paid by {order.paymentMethod === "WALLET" ? "wallet" : order.paymentMethod === "UPI" ? "UPI" : "cash"}</dt><dd>{rupees(order.totalPaise)}</dd></div>
              {order.paymentRef && <div className="flex justify-between text-muted"><dt>Reference</dt><dd>{order.paymentRef}</dd></div>}
            </dl>
            {order.note && <p className="border-t-[3px] border-ink px-5 py-3 text-sm"><span className="font-bold">Kitchen note:</span> {order.note}</p>}
          </section>

          {status === "PLACED" && <CancelOrderButton orderId={order.id} totalPaise={order.totalPaise} />}
        </div>
      </div>
    </div>
  );
}
