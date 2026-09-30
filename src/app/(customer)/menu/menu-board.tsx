"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Stepper, useCart } from "@/components/cart";
import { DietMark } from "@/components/marks";
import { rupees } from "@/lib/money";

type Item = {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  isVeg: boolean;
  isAvailable: boolean;
  stock: number | null;
  prepMinutes: number;
};
type Category = { id: string; name: string; items: Item[] };

export function MenuBoard({ categories, notice }: { categories: Category[]; notice: string | null }) {
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) => (!vegOnly || i.isVeg) && (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, query, vegOnly]);

  return (
    <div className="grid gap-8 lg:grid-cols-[180px_1fr_340px]">
      {/* Category rail */}
      <nav aria-label="Menu sections" className="hidden lg:block">
        <ul className="sticky top-28 space-y-1">
          {categories.map((c) => (
            <li key={c.id}>
              <a href={`#cat-${c.id}`} className="block border-l-[3px] border-transparent py-1 pl-3 font-bold hover:border-ink">
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h1 className="display text-4xl sm:text-5xl">Today&rsquo;s menu</h1>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <label className="sr-only" htmlFor="search">Search the menu</label>
            <input
              id="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dosa, chai, biryani…"
              className="field min-w-0 flex-1 sm:w-64"
            />
            <label className="chip cursor-pointer gap-2 py-1.5 has-checked:bg-leaf-soft">
              <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="size-4 accent-leaf" />
              Veg only
            </label>
          </div>
        </div>

        {notice && <p className="mb-6 border-[3px] border-ink bg-turmeric-soft px-4 py-3 font-bold">{notice}</p>}

        {visible.length === 0 && (
          <div className="panel p-8 text-center">
            <p className="font-extrabold">Nothing matches &ldquo;{query}&rdquo;.</p>
            <button className="btn btn-sm mt-4" onClick={() => { setQuery(""); setVegOnly(false); }}>
              Clear search
            </button>
          </div>
        )}

        <div className="space-y-10">
          {visible.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-28" aria-labelledby={`h-${c.id}`}>
              <h2 id={`h-${c.id}`} className="mb-4 inline-block border-[3px] border-ink bg-paper px-3 py-1 text-xl font-black">
                {c.name}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {c.items.map((item) => (
                  <DishCard key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <Tray />
    </div>
  );
}

function DishCard({ item }: { item: Item }) {
  const cart = useCart();
  const qty = cart.qtyOf(item.id);
  const lowStock = item.stock !== null && item.stock > 0 && item.stock <= 10;
  const max = Math.min(20, item.stock ?? 20);

  return (
    <li
      className={`relative flex flex-col border-[3px] border-ink bg-paper p-4 ${
        item.isAvailable ? "shadow-hard" : "opacity-70"
      } ${qty > 0 ? "bg-turmeric-soft" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1">
          <DietMark veg={item.isVeg} />
        </span>
        <h3 className="text-lg leading-tight font-extrabold">{item.name}</h3>
      </div>
      <p className="mt-1 flex-1 text-sm text-muted">{item.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {item.prepMinutes > 0 ? <span className="chip">~{item.prepMinutes} min</span> : <span className="chip">Ready to grab</span>}
        {lowStock && <span className="chip bg-chilli-soft">{item.stock} left</span>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="display nums text-2xl">{rupees(item.pricePaise)}</span>
        {!item.isAvailable ? (
          <span className="rotate-[-4deg] border-[3px] border-chilli px-2 py-0.5 font-black text-chilli">Sold out</span>
        ) : qty === 0 ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => cart.add({ id: item.id, name: item.name, pricePaise: item.pricePaise, isVeg: item.isVeg })}
          >
            Add
          </button>
        ) : (
          <Stepper qty={qty} max={max} label={item.name} onChange={(n) => cart.setQty(item.id, n)} />
        )}
      </div>
    </li>
  );
}

function Tray() {
  const cart = useCart();
  return (
    <>
      <aside aria-label="Your tray" className="hidden lg:block">
        <div className="panel sticky top-28 flex max-h-[calc(100dvh-8rem)] flex-col bg-steel/40">
          <div className="flex items-baseline justify-between border-b-[3px] border-ink bg-paper px-4 py-3">
            <h2 className="text-xl font-black">Your tray</h2>
            <span className="nums text-sm font-bold">{cart.count} {cart.count === 1 ? "item" : "items"}</span>
          </div>
          {cart.items.length === 0 ? (
            <p className="p-5 text-sm text-muted">Tap Add on anything you fancy. Your tray keeps until you check out.</p>
          ) : (
            <ul className="flex-1 divide-y-2 divide-dashed divide-ink overflow-y-auto bg-paper">
              {cart.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                  <DietMark veg={i.isVeg} size={14} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{i.name}</p>
                    <p className="nums text-sm text-muted">{rupees(i.pricePaise * i.qty)}</p>
                  </div>
                  <Stepper qty={i.qty} label={i.name} onChange={(n) => cart.setQty(i.id, n)} />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t-[3px] border-ink bg-paper p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-bold">Subtotal</span>
              <span className="display nums text-2xl">{rupees(cart.subtotalPaise)}</span>
            </div>
            {cart.count > 0 ? (
              <Link href="/checkout" className="btn btn-primary btn-lg w-full">Choose pickup time</Link>
            ) : (
              <button className="btn btn-lg w-full" disabled>Tray is empty</button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile tray bar */}
      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-paper p-3 lg:hidden">
          <Link href="/checkout" className="btn btn-primary btn-lg w-full justify-between">
            <span>{cart.count} in tray</span>
            <span className="nums">{rupees(cart.subtotalPaise)}</span>
          </Link>
        </div>
      )}
    </>
  );
}
