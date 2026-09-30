import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { businessDate } from "@/lib/domain/time";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  // Quote everything; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Sales export for the manager: one row per order line. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Managers only." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const to = DATE.test(params.get("to") ?? "") ? params.get("to")! : businessDate();
  const from = DATE.test(params.get("from") ?? "") ? params.get("from")! : to;
  if (from > to) return NextResponse.json({ error: "from must be on or before to." }, { status: 400 });

  const orders = await db.order.findMany({
    where: { businessDate: { gte: from, lte: to } },
    orderBy: [{ businessDate: "asc" }, { token: "asc" }],
    include: { items: true },
  });

  const header = ["date", "token", "channel", "status", "customer", "payment", "payment_ref", "item", "qty", "unit_inr", "line_inr", "order_subtotal_inr", "order_gst_inr", "order_total_inr", "placed_at"];
  const rows = orders.flatMap((o) =>
    o.items.map((i) => [
      o.businessDate, o.token, o.channel, o.status, o.customerName, o.paymentMethod, o.paymentRef ?? "",
      i.name, i.qty, (i.unitPaise / 100).toFixed(2), (i.linePaise / 100).toFixed(2),
      (o.subtotalPaise / 100).toFixed(2), (o.taxPaise / 100).toFixed(2), (o.totalPaise / 100).toFixed(2), o.placedAt.toISOString(),
    ]),
  );
  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="rasoi-sales-${from}-to-${to}.csv"`,
      "cache-control": "no-store",
    },
  });
}
