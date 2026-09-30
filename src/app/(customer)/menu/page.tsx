import type { Metadata } from "next";
import { db, getSettings } from "@/lib/db";
import { isOpenNow } from "@/lib/domain/slots";
import { minuteLabel } from "@/lib/domain/time";
import { MenuBoard } from "./menu-board";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const [categories, settings] = await Promise.all([
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { items: { orderBy: { name: "asc" } } },
    }),
    getSettings(),
  ]);

  const open = isOpenNow(new Date(), settings);
  const notice = !settings.acceptingOrders
    ? "The canteen has paused online orders. You can still browse."
    : !open
      ? `Closed right now. Orders open at ${minuteLabel(settings.openMinute)}.`
      : null;

  return (
    <MenuBoard
      notice={notice}
      categories={categories
        .filter((c) => c.items.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          items: c.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            pricePaise: i.pricePaise,
            isVeg: i.isVeg,
            isAvailable: i.isAvailable && i.stock !== 0,
            stock: i.stock,
            prepMinutes: i.prepMinutes,
          })),
        }))}
    />
  );
}
