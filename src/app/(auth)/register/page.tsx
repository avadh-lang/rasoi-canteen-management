"use client";

import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export default function RegisterPage() {
  const [state, action] = useActionState(register, null);
  return (
    <form action={action} className="panel w-full max-w-lg space-y-5 p-6 sm:p-8">
      <title>Create account · Rasoi</title>
      <div>
        <h1 className="display text-4xl">Create account</h1>
        <p className="mt-2 text-muted">For VCET students and staff. Your wallet starts at ₹0; top up by UPI or at the counter.</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input className="field" id="name" name="name" autoComplete="name" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">College email</label>
          <input className="field" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="rollNo">Roll or staff no. <span className="font-medium text-muted">(optional)</span></label>
          <input className="field uppercase" id="rollNo" name="rollNo" placeholder="22CE1042" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="field" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary btn-lg w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-sm">
        Already registered?{" "}
        <a href="/login" className="font-bold underline decoration-2 underline-offset-4">Sign in</a>
      </p>
    </form>
  );
}
