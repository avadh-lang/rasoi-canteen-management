"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveMenuItem } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/form-bits";

type ItemValues = {
  id?: string;
  name: string;
  description: string;
  pricePaise: number;
  categoryId: string;
  isVeg: boolean;
  isAvailable: boolean;
  stock: number | null;
  prepMinutes: number;
};

export function ItemForm({ item, categories }: { item?: ItemValues; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveMenuItem, null);
  const [track, setTrack] = useState(item ? item.stock !== null : false);

  return (
    <form action={action} className="panel max-w-2xl space-y-5 p-6">
      {item?.id && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="label" htmlFor="name">Dish name</label>
          <input id="name" name="name" className="field" defaultValue={item?.name} required maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor="price">Price (₹)</label>
          <input id="price" name="price" className="field nums" inputMode="decimal" defaultValue={item ? item.pricePaise / 100 : ""} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Short description</label>
        <input id="description" name="description" className="field" defaultValue={item?.description} maxLength={200} placeholder="What's in it, how it's served" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="categoryId">Menu section</label>
          <select id="categoryId" name="categoryId" className="field" defaultValue={item?.categoryId ?? categories[0]?.id}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="prepMinutes">Prep time (minutes)</label>
          <input id="prepMinutes" name="prepMinutes" type="number" min={0} max={90} className="field nums" defaultValue={item?.prepMinutes ?? 5} required />
          <p className="mt-1 text-xs text-muted">Use 0 for packaged items handed over at once.</p>
        </div>
      </div>

      <fieldset className="flex flex-wrap gap-x-6 gap-y-3">
        <legend className="label">Options</legend>
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" name="isVeg" defaultChecked={item?.isVeg ?? true} className="size-5 accent-leaf" /> Vegetarian</label>
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" name="isAvailable" defaultChecked={item?.isAvailable ?? true} className="size-5 accent-leaf" /> On the menu</label>
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" name="trackStock" checked={track} onChange={(e) => setTrack(e.target.checked)} className="size-5 accent-leaf" /> Limited quantity</label>
      </fieldset>
      {track && (
        <div className="max-w-40">
          <label className="label" htmlFor="stock">Portions available</label>
          <input id="stock" name="stock" type="number" min={0} className="field nums" defaultValue={item?.stock ?? 20} />
        </div>
      )}

      <FormMessage state={state} />
      <div className="flex gap-3">
        <SubmitButton pendingLabel="Saving…">{item?.id ? "Save changes" : "Add dish"}</SubmitButton>
        <Link href="/admin/menu" className="btn">Cancel</Link>
      </div>
    </form>
  );
}
