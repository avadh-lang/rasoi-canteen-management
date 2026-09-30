import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LiveRefresh } from "@/components/live-refresh";
import { requireUser } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { taxFor } from "@/lib/domain/pricing";
import { upcomingSlots } from "@/lib/domain/slots";
import { isExpired, normaliseCode, waitingOn } from "@/lib/domain/split";
import { groupInclude } from "@/server/groups";
import { slotBookings } from "@/server/orders";
import { JoinForm } from "../lobby";
import { TableView, type Seat } from "./table-view";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: `Table ${code.toUpperCase()}` };
}

export default async function TablePage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code: raw }, user] = await Promise.all([params, requireUser("CUSTOMER")]);
  const code = normaliseCode(raw);
  if (!code) notFound();
  if (code !== raw) redirect(`/group/${code}`);

  const group = await db.groupOrder.findUnique({ where: { code }, include: groupInclude });
  if (!group) notFound();

  const member = group.members.find((m) => m.userId === user.id);
  const expired = group.status === "OPEN" && isExpired(group.createdAt);

  if (group.status === "PLACED" && group.order && member) redirect(`/orders/${group.order.id}`);

  if (!member) {
    const closed = group.status !== "OPEN" || expired;
    return (
      <div className="panel mx-auto max-w-md p-8 shadow-hard-lg">
        <p className="font-bold">Table {code}</p>
        {closed ? (
          <>
            <h1 className="display mt-1 text-3xl">This table is closed</h1>
            <p className="mt-2 text-muted">Ask {group.host.name.split(" ")[0]} for a new code, or start your own.</p>
            <Link href="/group" className="btn btn-primary mt-6">Start a table</Link>
          </>
        ) : (
          <>
            <h1 className="display mt-1 text-3xl">Join {group.host.name.split(" ")[0]}&rsquo;s table?</h1>
            <p className="mt-2 text-muted">
              {group.members.length} {group.members.length === 1 ? "person is" : "people are"} ordering. You&rsquo;ll pay only for your own plate.
            </p>
            <JoinForm initial={code} />
          </>
        )}
      </div>
    );
  }

  const settings = await getSettings();
  const now = new Date();
  const seats: Seat[] = group.members.map((m) => {
    const lines = group.lines.filter((l) => l.userId === m.userId);
    const subtotal = lines.reduce((a, l) => a + l.menuItem.pricePaise * l.qty, 0);
    const share = subtotal + taxFor(subtotal, settings.taxBasisPoints);
    return {
      userId: m.userId,
      name: m.user.name,
      isHost: m.userId === group.hostId,
      isMe: m.userId === user.id,
      ready: m.ready,
      short: share > m.user.walletBalance,
      sharePaise: share,
      lines: lines.map((l) => ({ id: l.menuItemId, name: l.menuItem.name, qty: l.qty, isVeg: l.menuItem.isVeg, linePaise: l.menuItem.pricePaise * l.qty })),
    };
  });

  const prep = Math.max(0, ...group.lines.map((l) => l.menuItem.prepMinutes));
  const isHost = group.hostId === user.id;
  const slots = isHost && group.status === "OPEN" ? upcomingSlots(now, settings, prep, await slotBookings(db, now)) : [];
  const waiting = waitingOn(seats.map((s) => ({ userId: s.userId, ready: s.ready, itemCount: s.lines.length })));

  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { isAvailable: true }, orderBy: { name: "asc" } } },
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <LiveRefresh everyMs={3000} />
      </div>
      <TableView
        groupId={group.id}
        code={code}
        status={expired ? "EXPIRED" : (group.status as "OPEN" | "DISBANDED")}
        hostName={group.host.name}
        isHost={isHost}
        seats={seats}
        waitingOn={waiting.map((id) => seats.find((s) => s.userId === id)!.name.split(" ")[0])}
        taxBasisPoints={settings.taxBasisPoints}
        slots={slots.map((s) => ({ at: s.startsAt.toISOString(), label: s.label, full: s.full, remaining: s.remaining }))}
        menu={categories
          .filter((c) => c.items.length > 0)
          .map((c) => ({
            id: c.id,
            name: c.name,
            items: c.items.filter((i) => i.stock !== 0).map((i) => ({ id: i.id, name: i.name, pricePaise: i.pricePaise, isVeg: i.isVeg })),
          }))}
      />
    </>
  );
}
