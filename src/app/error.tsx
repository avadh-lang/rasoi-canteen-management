"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[60dvh] place-items-center px-4">
      <div className="panel max-w-md bg-chilli-soft p-8 shadow-hard-lg">
        <h1 className="display text-3xl">That didn&rsquo;t load</h1>
        <p className="mt-3">Something failed on our side. If you were placing an order, check My orders before trying again.</p>
        {error.digest && <p className="nums mt-2 text-sm text-muted">Reference {error.digest}</p>}
        <button className="btn btn-primary mt-6" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
