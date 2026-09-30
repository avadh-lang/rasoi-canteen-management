/** FSSAI food marks: green square + dot for veg, brown square + triangle for non-veg. */
export function DietMark({ veg, size = 16 }: { veg: boolean; size?: number }) {
  const color = veg ? "var(--color-leaf)" : "var(--color-nonveg)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={veg ? "Vegetarian" : "Non-vegetarian"} className="shrink-0">
      <rect x="1" y="1" width="14" height="14" fill="#fff" stroke={color} strokeWidth="2" />
      {veg ? <circle cx="8" cy="8" r="3.6" fill={color} /> : <path d="M8 3.8 12.3 11.6H3.7Z" fill={color} />}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display inline-flex items-baseline gap-1 text-2xl ${className}`}>
      Rasoi
      <span aria-hidden className="inline-block size-2.5 translate-y-[-2px] rounded-full border-2 border-ink bg-turmeric" />
    </span>
  );
}
