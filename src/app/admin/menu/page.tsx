import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/app-shell";
import { DietMark } from "@/components/marks";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";
import { AddCategory, AvailabilityToggle, StockCell } from "./menu-controls";

export const metadata: Metadata = { title: "Menu" };

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { name: "asc" }, include: { _count: { select: { orderItems: true } } } } },
  });

  return (
    <>
      <PageTitle title="Menu" aside={<Link href="/admin/menu/new" className="btn btn-primary">Add a dish</Link>}>
        Prices, stock and what&rsquo;s on today. Changes show on the student menu and counter straight away.
      </PageTitle>
      {saved && <p role="status" className="mb-6 border-[3px] border-ink bg-leaf-soft px-4 py-2 font-bold">Saved {saved}.</p>}

      <div className="space-y-8">
        {categories.map((c) => (
          <section key={c.id} aria-labelledby={`c-${c.id}`} className="panel overflow-x-auto">
            <h2 id={`c-${c.id}`} className="border-b-[3px] border-ink bg-steel/40 px-4 py-2.5 text-lg font-black">
              {c.name} <span className="nums font-bold text-muted">({c.items.length})</span>
            </h2>
            {c.items.length === 0 ? (
              <p className="p-4 text-muted">No dishes in this section yet.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b-2 border-ink">
                  <tr>
                    <th className="px-4 py-2">Dish</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2">Prep</th>
                    <th className="px-4 py-2">Stock</th>
                    <th className="px-4 py-2">On menu</th>
                    <th className="px-4 py-2"><span className="sr-only">Edit</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/15">
                  {c.items.map((i) => (
                    <tr key={i.id} className={i.isAvailable ? "" : "bg-steel/30"}>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2 font-bold"><DietMark veg={i.isVeg} size={14} />{i.name}</span>
                        <span className="nums text-xs text-muted">{i._count.orderItems} orders all time</span>
                      </td>
                      <td className="nums px-4 py-2 text-right font-black">{rupees(i.pricePaise)}</td>
                      <td className="nums px-4 py-2">{i.prepMinutes ? `${i.prepMinutes} min` : "Packaged"}</td>
                      <td className="px-4 py-2"><StockCell id={i.id} stock={i.stock} /></td>
                      <td className="px-4 py-2"><AvailabilityToggle id={i.id} name={i.name} on={i.isAvailable} /></td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/admin/menu/${i.id}`} className="font-bold underline decoration-2 underline-offset-4">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
        <AddCategory />
      </div>
    </>
  );
}
