"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Re-renders the current server page every few seconds so boards and order
 * trackers stay live without a websocket server. Pauses in background tabs.
 */
export function LiveRefresh({ everyMs = 5000, label = true }: { everyMs?: number; label?: boolean }) {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastSync(new Date());
    };
    const id = window.setInterval(tick, everyMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, everyMs]);

  if (!label) return null;
  return (
    <span className="chip bg-paper" aria-live="off">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2.5 rounded-full bg-leaf" />
      </span>
      Live
      {lastSync && (
        <span className="font-medium text-muted nums">
          {lastSync.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
      )}
    </span>
  );
}
