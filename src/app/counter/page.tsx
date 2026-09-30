import type { Metadata } from "next";
import { db, getSettings } from "@/lib/db";
import { Pos } from "./pos";

export const metadata: Metadata = { title: "Counter billing" };

export default async function CounterPage() {
  const [categories, settings] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { name: "asc" } } } }),
    getSettings(),
  ]);
  return (
    <Pos
      taxBasisPoints={settings.taxBasisPoints}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: c.items.map((i) => ({
          id: i.id,
          name: i.name,
          pricePaise: i.pricePaise,
          isVeg: i.isVeg,
          available: i.isAvailable && i.stock !== 0,
          stock: i.stock,
        })),
      }))}
    />
  );
}
