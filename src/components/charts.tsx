/**
 * Small server-rendered charts. Single-series bars use turmeric with ink
 * outlines; every bar has a hover/focus tooltip and each chart ships a
 * screen-reader table so no value lives in the graphic alone.
 */

export type Bar = { label: string; value: number; display: string; detail?: string; highlight?: boolean };

export function ColumnChart({ title, bars, height = 180, labelEvery = 1 }: { title: string; bars: Bar[]; height?: number; labelEvery?: number }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const peak = bars.reduce((best, b) => (b.value > best.value ? b : best), bars[0]);
  return (
    <figure>
      <div className="relative" style={{ height }}>
        {/* recessive gridlines at 50% and 100% */}
        <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-ink/20" />
        <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink/20" />
        <div className="absolute inset-0 flex items-end gap-[3px] border-b-[3px] border-ink" aria-hidden>
          {bars.map((b) => (
            <div key={b.label} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none">
              <div
                className={`w-full rounded-t-[4px] border-2 border-b-0 border-ink transition-colors group-hover:bg-ink group-focus:bg-ink ${b.highlight ? "bg-ink" : "bg-turmeric"}`}
                style={{ height: `${Math.max(b.value > 0 ? 2 : 0, (b.value / max) * 100)}%` }}
              />
              {b === peak && b.value > 0 && (
                <span className="nums pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-black whitespace-nowrap" style={{ bottom: `calc(${(b.value / max) * 100}% + 4px)` }}>
                  {b.display}
                </span>
              )}
              <span className="nums pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 border-2 border-ink bg-paper px-2 py-1 text-xs whitespace-nowrap shadow-hard-sm group-hover:block group-focus:block">
                <span className="block font-black">{b.display}</span>
                <span className="block">{b.detail ?? b.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-1.5 flex gap-[3px]">
        {bars.map((b, i) => (
          <span key={b.label} className="nums flex-1 text-center text-[11px] font-bold whitespace-nowrap">
            {i % labelEvery === 0 ? b.label : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {bars.map((b) => (
            <tr key={b.label}>
              <th scope="row">{b.detail ?? b.label}</th>
              <td>{b.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function RankBars({ rows }: { rows: { label: string; value: number; display: string; sub: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[1.25rem_minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="nums font-black">{i + 1}</span>
          <span className="truncate font-bold" title={r.label}>{r.label}</span>
          <span className="h-4 border-2 border-ink bg-paper" aria-hidden>
            <span className="block h-full rounded-r-[4px] bg-turmeric" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="nums text-right whitespace-nowrap"><span className="font-black">{r.display}</span> <span className="text-muted">{r.sub}</span></span>
        </li>
      ))}
    </ol>
  );
}

// Validated categorical palette (dataviz validator: all checks pass on white).
const MIX_COLORS = ["#b98000", "#3f6fe0", "#1a9a4a"];

export function MixBar({ parts }: { parts: { label: string; value: number; display: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-9 gap-[2px] border-[3px] border-ink bg-paper" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}>
        {parts.map((p, i) =>
          p.value > 0 ? (
            <div key={p.label} className="grid place-items-center text-xs font-black text-paper" style={{ width: `${(p.value / total) * 100}%`, background: MIX_COLORS[i] }} title={`${p.label}: ${p.display}`}>
              {p.value / total > 0.12 ? `${Math.round((p.value / total) * 100)}%` : ""}
            </div>
          ) : null,
        )}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2">
            <span aria-hidden className="size-3.5 border-2 border-ink" style={{ background: MIX_COLORS[i] }} />
            <span className="font-bold">{p.label}</span>
            <span className="nums ml-auto">{p.display}</span>
            <span className="nums w-10 text-right text-muted">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
