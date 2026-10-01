/** Shown while a page's data loads: a skeleton in the shape of the layout. */
export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="animate-pulse motion-reduce:animate-none">
      <span className="sr-only">{label}…</span>
      <div className="mb-6 h-12 w-72 max-w-full border-[3px] border-ink/20 bg-paper/60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-36 border-[3px] border-ink/20 bg-paper/60" />
        ))}
      </div>
    </div>
  );
}
