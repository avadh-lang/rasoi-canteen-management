"use client";

import { useActionState, useRef } from "react";
import { login } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/form-bits";

const DEMO = [
  { email: "aarav@student.test", who: "Student", note: "Order, pay, track" },
  { email: "kitchen@rasoi.test", who: "Kitchen", note: "Cook the queue" },
  { email: "counter@rasoi.test", who: "Counter", note: "Bill and hand over" },
  { email: "admin@rasoi.test", who: "Manager", note: "Menu, reports, people" },
];

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, null);
  const form = useRef<HTMLFormElement>(null);

  function fillDemo(email: string) {
    const f = form.current;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("password") as HTMLInputElement).value = "rasoi@123";
    f.requestSubmit();
  }

  return (
    <div className="grid w-full gap-8 md:grid-cols-[1fr_300px]">
      <form ref={form} action={action} className="panel space-y-5 p-6 sm:p-8">
        <h1 className="display text-4xl">Sign in</h1>
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className="label" htmlFor="email">College email</label>
          <input className="field" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="field" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <FormMessage state={state} />
        <SubmitButton className="btn btn-primary btn-lg w-full" pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
        <p className="text-sm">
          New here?{" "}
          <a href="/register" className="font-bold underline decoration-2 underline-offset-4">
            Create a student account
          </a>
        </p>
      </form>

      <aside className="self-start border-[3px] border-dashed border-ink bg-paper/60 p-5">
        <h2 className="font-extrabold">Demo accounts</h2>
        <p className="mt-1 text-sm text-muted">Password for all: rasoi@123</p>
        <ul className="mt-4 space-y-2">
          {DEMO.map((d) => (
            <li key={d.email}>
              <button
                type="button"
                onClick={() => fillDemo(d.email)}
                className="w-full border-2 border-ink bg-paper px-3 py-2 text-left shadow-hard-sm transition-transform hover:-translate-y-px active:translate-y-px"
              >
                <span className="block font-extrabold">{d.who}</span>
                <span className="block text-xs text-muted">{d.note}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
