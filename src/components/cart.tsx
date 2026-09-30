"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { id: string; name: string; pricePaise: number; isVeg: boolean; qty: number };

type CartApi = {
  items: CartItem[];
  count: number;
  subtotalPaise: number;
  qtyOf: (id: string) => number;
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<CartApi | null>(null);

/** Tray contents live in localStorage per account, so a refresh or a lecture doesn't lose them. */
export function CartProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const key = `rasoi:tray:${userId}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once on mount
      if (saved) setItems(JSON.parse(saved));
    } catch {
      /* storage blocked or corrupt: start empty */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, key, ready]);

  const add = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, qty: Math.min(20, p.qty + 1) } : p));
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => (qty <= 0 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, qty: Math.min(20, qty) } : p))));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const api = useMemo<CartApi>(
    () => ({
      items,
      count: items.reduce((a, i) => a + i.qty, 0),
      subtotalPaise: items.reduce((a, i) => a + i.qty * i.pricePaise, 0),
      qtyOf: (id) => items.find((i) => i.id === id)?.qty ?? 0,
      add,
      setQty,
      clear,
      ready,
    }),
    [items, add, setQty, clear, ready],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function Stepper({
  qty,
  onChange,
  max = 20,
  label,
}: {
  qty: number;
  onChange: (qty: number) => void;
  max?: number;
  label: string;
}) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-full border-[3px] border-ink bg-turmeric shadow-hard-sm" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className="w-10 text-xl font-black hover:bg-turmeric-soft" onClick={() => onChange(qty - 1)} aria-label={`Remove one ${label}`}>
        −
      </button>
      <span className="nums grid min-w-8 place-items-center border-x-[3px] border-ink bg-paper px-1 font-black" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        className="w-10 text-xl font-black hover:bg-turmeric-soft disabled:opacity-40"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= max}
        aria-label={`Add one ${label}`}
      >
        +
      </button>
    </div>
  );
}
