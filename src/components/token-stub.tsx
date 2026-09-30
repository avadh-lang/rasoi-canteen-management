import type { OrderStatus } from "@/lib/domain/constants";

const TONE: Record<OrderStatus, string> = {
  PLACED: "bg-turmeric",
  PREPARING: "bg-turmeric",
  READY: "bg-leaf-soft ready-pulse",
  COLLECTED: "bg-steel",
  CANCELLED: "bg-chilli-soft",
};

/**
 * The canteen token: a tear-off stub with the number you listen for.
 * Notched sides and a perforated tear line, like the paper tokens it replaces.
 */
export function TokenStub({
  token,
  status,
  caption,
  size = "lg",
  animate = false,
}: {
  token: number;
  status: OrderStatus;
  caption?: string;
  size?: "sm" | "lg";
  animate?: boolean;
}) {
  const big = size === "lg";
  return (
    <div
      className={`relative inline-flex -rotate-2 flex-col border-[3px] border-ink ${TONE[status]} ${
        big ? "shadow-hard-lg" : "shadow-hard"
      } ${animate ? "token-drop" : ""}`}
    >
      {/* side notches */}
      <span aria-hidden className="absolute top-1/2 -left-[15px] size-7 -translate-y-1/2 rounded-full border-[3px] border-ink bg-tile [clip-path:inset(0_0_0_50%)]" />
      <span aria-hidden className="absolute top-1/2 -right-[15px] size-7 -translate-y-1/2 rounded-full border-[3px] border-ink bg-tile [clip-path:inset(0_50%_0_0)]" />
      <div className={big ? "px-8 pt-4 pb-3" : "px-4 pt-2 pb-1.5"}>
        <p className={`font-bold ${big ? "text-base" : "text-xs"}`}>Token</p>
        <p className={`display nums ${big ? "text-[5.5rem] sm:text-[7rem]" : "text-4xl"} ${status === "CANCELLED" ? "line-through decoration-[6px]" : ""}`}>
          {token}
        </p>
      </div>
      <div className="perforated-x mx-2 opacity-60" aria-hidden />
      <p className={`bg-paper/70 text-center font-bold ${big ? "px-8 py-2 text-sm" : "px-3 py-1 text-[11px]"}`}>
        {caption ?? "Show this at the counter"}
      </p>
    </div>
  );
}
