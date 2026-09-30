"use client";

import { useActionState, useState, useTransition } from "react";
import { createStaff, updateUser } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { ROLE_LABEL, ROLES } from "@/lib/domain/constants";

export function UserControls({ id, role, active, self }: { id: string; role: string; active: boolean; self: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (patch: { role?: string; active?: boolean }) =>
    start(async () => {
      const r = await updateUser(id, patch);
      setError(r.ok ? null : (r.message ?? "Couldn't save."));
    });

  return (
    <>
      <td className="px-4 py-2">
        <label className="sr-only" htmlFor={`role-${id}`}>Role</label>
        <select id={`role-${id}`} className="field h-9 min-h-0 py-1 text-sm" defaultValue={role} disabled={self || pending} onChange={(e) => run({ role: e.target.value })}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        {error && <p role="alert" className="mt-1 text-xs font-bold text-chilli">{error}</p>}
      </td>
      <td className="px-4 py-2">
        <button className={`btn btn-sm ${active ? "" : "btn-go"}`} disabled={self || pending} onClick={() => run({ active: !active })}>
          {active ? "Switch off" : "Switch on"}
        </button>
      </td>
    </>
  );
}

export function NewStaffForm() {
  const [state, action] = useActionState(createStaff, null);
  return (
    <form action={action} className="panel space-y-4 p-5" key={state?.ok ? state.message : "form"}>
      <h2 className="text-xl font-black">Add a staff account</h2>
      <div>
        <label className="label" htmlFor="s-name">Name</label>
        <input id="s-name" name="name" className="field" required />
      </div>
      <div>
        <label className="label" htmlFor="s-email">Email</label>
        <input id="s-email" name="email" type="email" className="field" required />
      </div>
      <div>
        <label className="label" htmlFor="s-role">Role</label>
        <select id="s-role" name="role" className="field" defaultValue="KITCHEN">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="s-pass">Temporary password</label>
        <input id="s-pass" name="password" type="text" minLength={8} className="field" required autoComplete="off" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Adding…">Add account</SubmitButton>
    </form>
  );
}
