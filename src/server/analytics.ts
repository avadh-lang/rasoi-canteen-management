import "server-only";
import { db } from "@/lib/db";
import { addDays, businessDate, istMidnight, istParts } from "@/lib/domain/time";

const NOT_CANCELLED = { status: { not: "CANCELLED" } };

export async function dashboard(now = new Date()) {
  const today = businessDate(now);
  const weekStart = addDays(today, -6);
  const weekStartAt = istMidnight(weekStart);

  const [todayOrders, weekOrders, weekItems, active, lowStock, activity] = await Promise.all([
    db.order.findMany({
      where: { businessDate: today },
      select: { status: true, totalPaise: true, placedAt: true, readyAt: true, preparingAt: true, channel: true },
    }),
    db.order.findMany({
      where: { businessDate: { gte: weekStart }, ...NOT_CANCELLED },
      select: { businessDate: true, totalPaise: true, paymentMethod: true },
    }),
    db.orderItem.groupBy({
      by: ["name"],
      where: { order: { placedAt: { gte: weekStartAt }, ...NOT_CANCELLED } },
      _sum: { qty: true, linePaise: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 8,
    }),
    db.order.count({ where: { businessDate: today, status: { in: ["PLACED", "PREPARING", "READY"] } } }),
    db.menuItem.findMany({
      where: { stock: { not: null, lte: 10 }, isAvailable: true },
      orderBy: { stock: "asc" },
      select: { id: true, name: true, stock: true },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { actor: { select: { name: true } } } }),
  ]);

  const kept = todayOrders.filter((o) => o.status !== "CANCELLED");
  const revenue = kept.reduce((a, o) => a + o.totalPaise, 0);
  const prepTimes = kept
    .filter((o) => o.readyAt)
    .map((o) => (o.readyAt!.getTime() - o.placedAt.getTime()) / 60_000);
  const avgPrep = prepTimes.length ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : null;

  const byDay = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(weekStart, i);
    const orders = weekOrders.filter((o) => o.businessDate === key);
    return { key, revenue: orders.reduce((a, o) => a + o.totalPaise, 0), orders: orders.length };
  });

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
  for (const o of kept) hours[Math.floor(istParts(o.placedAt).minuteOfDay / 60)].orders++;
  const busyHours = hours.filter((h) => h.hour >= 7 && h.hour <= 23);

  const payments = (["WALLET", "UPI", "CASH"] as const).map((m) => ({
    method: m,
    revenue: weekOrders.filter((o) => o.paymentMethod === m).reduce((a, o) => a + o.totalPaise, 0),
  }));

  return {
    today: {
      revenue,
      orders: kept.length,
      avgTicket: kept.length ? Math.round(revenue / kept.length) : 0,
      cancelled: todayOrders.length - kept.length,
      online: kept.filter((o) => o.channel === "ONLINE").length,
      active,
      avgPrep,
    },
    byDay,
    busyHours,
    topItems: weekItems.map((i) => ({ name: i.name, qty: i._sum.qty ?? 0, revenue: i._sum.linePaise ?? 0 })),
    payments,
    lowStock,
    activity,
  };
}
