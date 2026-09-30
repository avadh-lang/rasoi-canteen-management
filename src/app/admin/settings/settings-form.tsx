"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/form-bits";

type Values = { open: string; close: string; slotMinutes: number; slotCapacity: number; acceptingOrders: boolean; taxPercent: number };

export function SettingsForm({ values }: { values: Values }) {
  const [state, action] = useActionState(saveSettings, null);
  return (
    <form action={action} className="panel max-w-2xl space-y-6 p-6">
      <label className="flex items-start gap-3 border-[3px] border-ink bg-turmeric-soft p-4">
        <input type="checkbox" name="acceptingOrders" defaultChecked={values.acceptingOrders} className="mt-1 size-5 accent-ink" />
        <span>
          <span className="block font-black">Take online orders</span>
          <span className="block text-sm">Switch off during a rush or a power cut. The counter keeps working.</span>
        </span>
      </label>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="label mb-2">Opening hours (IST)</legend>
        <div>
          <label className="label" htmlFor="open">Opens</label>
          <input id="open" name="open" type="time" className="field nums" defaultValue={values.open} required />
        </div>
        <div>
          <label className="label" htmlFor="close">Last pickup ends</label>
          <input id="close" name="close" type="time" className="field nums" defaultValue={values.close} required />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="label mb-2">Pickup slots and tax</legend>
        <div>
          <label className="label" htmlFor="slotMinutes">Slot length</label>
          <select id="slotMinutes" name="slotMinutes" className="field" defaultValue={values.slotMinutes}>
            {[10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="slotCapacity">Orders per slot</label>
          <input id="slotCapacity" name="slotCapacity" type="number" min={1} max={500} className="field nums" defaultValue={values.slotCapacity} required />
        </div>
        <div>
          <label className="label" htmlFor="taxPercent">GST %</label>
          <input id="taxPercent" name="taxPercent" type="number" step="0.5" min={0} max={28} className="field nums" defaultValue={values.taxPercent} required />
        </div>
      </fieldset>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
    </form>
  );
}
