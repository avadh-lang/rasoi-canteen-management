import type { OrderStatus } from "@/lib/domain/constants";
import { timeLabel } from "@/lib/domain/time";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PLACED", label: "Received" },
  { status: "PREPARING", label: "Cooking" },
  { status: "READY", label: "Ready" },
  { status: "COLLECTED", label: "Collected" },
];

export function StatusTrack({
  status,
  times,
}: {
  status: OrderStatus;
  times: Partial<Record<OrderStatus, Date | null>>;
}) {
  if (status === "CANCELLED") {
    return <p className="border-[3px] border-ink bg-chilli-soft px-4 py-3 font-black">This order was cancelled.</p>;
  }
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="grid grid-cols-4 border-[3px] border-ink bg-paper" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const at = times[step.status];
        return (
          <li
            key={step.status}
            aria-current={i === current ? "step" : undefined}
            className={`border-ink px-2 py-3 text-center not-last:border-r-[3px] sm:px-3 ${
              i === current ? (status === "READY" ? "bg-leaf text-paper" : "bg-turmeric") : done ? "bg-turmeric-soft" : ""
            }`}
          >
            <span className="block text-sm font-black sm:text-base">{step.label}</span>
            <span className="nums block text-xs">{done && at ? timeLabel(at) : " "}</span>
          </li>
        );
      })}
    </ol>
  );
}
