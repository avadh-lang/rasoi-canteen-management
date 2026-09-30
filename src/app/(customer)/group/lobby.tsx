"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { joinTableByCode, startTable } from "@/app/actions/group";

export function StartButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-6">
      {error && <p role="alert" className="mb-3 text-sm font-bold text-chilli">{error}</p>}
      <button
        className="btn btn-primary btn-lg w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await startTable();
            if (r.ok) router.push(`/group/${r.code}`);
            else setError(r.message);
          })
        }
      >
        {pending ? "Setting the table…" : "Start a table"}
      </button>
    </div>
  );
}

/** Four letter boxes, like the paper token pads at the counter. */
export function JoinForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [letters, setLetters] = useState<string[]>(() => initial.toUpperCase().padEnd(4, " ").slice(0, 4).split("").map((c) => c.trim()));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const code = letters.join("");

  function set(i: number, raw: string) {
    const typed = raw.toUpperCase().replace(/[^A-Z]/g, "");
    if (typed.length > 1) {
      // pasted a whole code
      const next = typed.slice(0, 4).padEnd(4, " ").split("").map((c) => c.trim());
      setLetters(next);
      boxes.current[Math.min(3, typed.length)]?.focus();
      return;
    }
    const next = [...letters];
    next[i] = typed;
    setLetters(next);
    if (typed && i < 3) boxes.current[i + 1]?.focus();
  }

  return (
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await joinTableByCode(code);
          if (r.ok) router.push(`/group/${r.code}`);
          else setError(r.message);
        });
      }}
    >
      <fieldset>
        <legend className="sr-only">Table code</legend>
        <div className="flex gap-2">
          {letters.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              aria-label={`Letter ${i + 1}`}
              value={c}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !c && i > 0) boxes.current[i - 1]?.focus();
              }}
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              className="display size-16 border-[3px] border-ink bg-paper text-center text-3xl uppercase shadow-hard-sm focus:bg-turmeric focus:outline-none sm:size-18"
            />
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm font-bold text-chilli">{error}</p>}
      <button className="btn btn-ink btn-lg mt-5 w-full" disabled={pending || code.length !== 4}>
        {pending ? "Finding table…" : "Join table"}
      </button>
    </form>
  );
}
