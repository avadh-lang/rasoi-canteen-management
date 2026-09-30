"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { addCategory, restock, toggleAvailability } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function AvailabilityToggle({ id, name, on }: { id: string; name: string; on: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <button
      role="switch"
      aria-checked={optimistic}
      aria-label={`${name} on the menu`}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          await toggleAvailability(id, !optimistic);
        })
      }
      className={`relative h-7 w-13 rounded-full border-[3px] border-ink transition-colors ${optimistic ? "bg-leaf" : "bg-steel"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full border-2 border-ink bg-paper transition-[left] ${optimistic ? "left-[26px]" : "left-0.5"}`} />
    </button>
  );
}

export function StockCell({ id, stock }: { id: string; stock: number | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(stock ?? ""));
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={`chip nums ${stock === 0 ? "bg-chilli" : stock !== null && stock <= 10 ? "bg-chilli-soft" : ""}`}>
        {stock === null ? "Made to order" : stock === 0 ? "Sold out" : `${stock} left`}
      </button>
    );
  }
  const save = (next: number | null) =>
    start(async () => {
      await restock(id, next);
      setEditing(false);
    });
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        save(value === "" ? null : Math.max(0, Math.floor(Number(value))));
      }}
    >
      <label className="sr-only" htmlFor={`stock-${id}`}>Stock</label>
      <input id={`stock-${id}`} autoFocus className="field nums h-9 min-h-0 w-20 py-1" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} placeholder="∞" />
      <button className="btn btn-sm btn-primary" disabled={pending}>Save</button>
      <button type="button" className="text-xs font-bold underline" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}

export function AddCategory() {
  const [state, action] = useActionState(addCategory, null);
  return (
    <form action={action} className="flex max-w-lg flex-wrap items-end gap-3 border-[3px] border-dashed border-ink p-4">
      <div className="min-w-0 flex-1">
        <label className="label" htmlFor="cat">New menu section</label>
        <input id="cat" name="name" className="field" placeholder="Juices, Desserts…" required />
      </div>
      <SubmitButton className="btn" pendingLabel="Adding…">Add section</SubmitButton>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}
