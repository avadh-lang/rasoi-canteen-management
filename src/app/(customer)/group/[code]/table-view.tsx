"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { close, leave, markReady, placeTableOrder, updatePlate } from "@/app/actions/group";
import { Stepper } from "@/components/cart";
import { DietMark } from "@/components/marks";
import { rupees } from "@/lib/money";

export type Seat = {
  userId: string;
  name: string;
  isHost: boolean;
  isMe: boolean;
  ready: boolean;
  short: boolean;
  sharePaise: number;
  lines: { id: string; name: string; qty: number; isVeg: boolean; linePaise: number }[];
};
type MenuItem = { id: string; name: string; pricePaise: number; isVeg: boolean };
type SlotView = { at: string; label: string; full: boolean; remaining: number };

export function TableView({
  groupId,
  code,
  status,
  hostName,
  isHost,
  seats,
  waitingOn,
  taxBasisPoints,
  slots,
  menu,
}: {
  groupId: string;
  code: string;
  status: "OPEN" | "DISBANDED" | "EXPIRED";
  hostName: string;
  isHost: boolean;
  seats: Seat[];
  waitingOn: string[];
  taxBasisPoints: number;
  slots: SlotView[];
  menu: { id: string; name: string; items: MenuItem[] }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const me = seats.find((s) => s.isMe)!;
  const open = status === "OPEN";
  const eating = seats.filter((s) => s.lines.length > 0);
  const total = eating.reduce((a, s) => a + s.sharePaise, 0);

  const act = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.message ?? "That didn't work.");
      else after?.();
      router.refresh();
    });

  if (!open) {
    return (
      <div className="panel mx-auto max-w-md p-8 text-center shadow-hard-lg">
        <h1 className="display text-3xl">{status === "EXPIRED" ? "This table expired" : "This table was closed"}</h1>
        <p className="mt-2 text-muted">Nothing was charged. Start a new table whenever you&rsquo;re ready.</p>
        <Link href="/group" className="btn btn-primary mt-6">Start a table</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 pb-28 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-8">
        <header className="flex flex-wrap items-center gap-6">
          <TableCode code={code} />
          <div className="min-w-0 flex-1">
            <h1 className="display text-3xl sm:text-4xl">{isHost ? "Your table" : `${hostName.split(" ")[0]}'s table`}</h1>
            <p className="mt-1 text-muted">
              {seats.length} {seats.length === 1 ? "seat" : "seats"} taken. Everyone pays for their own plate.
            </p>
            <ShareButtons code={code} host={hostName.split(" ")[0]} />
          </div>
        </header>

        {/* The table: one card per seat. */}
        <section aria-label="Seats at the table">
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {seats.map((s) => (
              <li
                key={s.userId}
                className={`relative flex flex-col border-[3px] border-ink ${s.isMe ? "bg-turmeric-soft shadow-hard-lg" : "bg-paper shadow-hard"}`}
              >
                <div className="flex items-start justify-between gap-2 border-b-[3px] border-ink px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">{s.isMe ? "You" : s.name}</p>
                    <p className="text-xs font-bold">
                      {s.isHost ? "Host" : "Guest"}
                      {s.short && s.lines.length > 0 && <span className="ml-2 text-chilli">needs a top-up</span>}
                    </p>
                  </div>
                  <ReadyStamp ready={s.ready} empty={s.lines.length === 0} />
                </div>
                <ul className="flex-1 space-y-1 px-4 py-3 text-sm">
                  {s.lines.length === 0 && <li className="text-muted">{s.isMe ? "Add food from the menu below." : "Still choosing…"}</li>}
                  {s.lines.map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <DietMark veg={l.isVeg} size={12} />
                      <span className="nums font-black">{l.qty}×</span>
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className="nums">{rupees(l.linePaise)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between border-t-2 border-dashed border-ink px-4 py-2">
                  <span className="text-sm font-bold">Share with GST</span>
                  <span className="display nums text-2xl">{rupees(s.sharePaise)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <PlateEditor groupId={groupId} menu={menu} mine={me.lines} disabled={pending} onError={setError} />
      </div>

      {/* Bill + actions */}
      <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
        <div className="panel">
          <h2 className="border-b-[3px] border-ink px-5 py-3 text-xl font-black">Table bill</h2>
          <ul className="divide-y-2 divide-dashed divide-ink">
            {eating.length === 0 && <li className="px-5 py-4 text-muted">Nobody has added food yet.</li>}
            {eating.map((s) => (
              <li key={s.userId} className="nums flex items-center justify-between px-5 py-2.5">
                <span className="flex items-center gap-2 font-bold">
                  <span aria-hidden className={`size-3 rounded-full border-2 border-ink ${s.ready ? "bg-leaf" : "bg-paper"}`} />
                  {s.isMe ? "You" : s.name.split(" ")[0]}
                </span>
                <span>{rupees(s.sharePaise)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t-[3px] border-ink px-5 py-3">
            <span className="font-black">Total</span>
            <span className="display nums text-3xl">{rupees(total)}</span>
          </div>
          <p className="border-t-[3px] border-ink px-5 py-2 text-xs text-muted">
            Includes GST {taxBasisPoints / 100}%. Shares are charged from each person&rsquo;s wallet when the host places the order.
          </p>
        </div>

        {error && <p role="alert" className="border-[3px] border-ink bg-chilli-soft px-3 py-2 text-sm font-bold">{error}</p>}

        {isHost ? (
          <HostPanel groupId={groupId} slots={slots} waitingOn={waitingOn} canPlace={eating.length > 0 && waitingOn.length === 0} total={total} pending={pending} act={act} router={router} />
        ) : (
          <button className="btn btn-sm" disabled={pending} onClick={() => act(() => leave(groupId), () => router.push("/group"))}>
            Leave table
          </button>
        )}
      </aside>

      {/* My confirmation bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-paper">
        <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Your share</p>
            <p className="display nums text-2xl">{rupees(me.sharePaise)}</p>
          </div>
          {me.short && me.lines.length > 0 && (
            <Link href="/wallet" className="hidden text-sm font-bold text-chilli underline sm:block">Top up your wallet first</Link>
          )}
          <button
            className={`btn btn-lg ${me.ready ? "btn-go" : "btn-primary"}`}
            disabled={pending || me.lines.length === 0}
            aria-pressed={me.ready}
            onClick={() => act(() => markReady(groupId, !me.ready))}
          >
            {me.lines.length === 0 ? "Add food first" : me.ready ? "You're in. Tap to change" : `I'm in for ${rupees(me.sharePaise)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableCode({ code }: { code: string }) {
  return (
    <div className="-rotate-2 border-[3px] border-ink bg-ink px-5 py-3 text-paper shadow-[6px_6px_0_0_var(--color-turmeric)]">
      <p className="text-xs font-bold">Table code</p>
      <p className="display text-5xl tracking-[0.12em]">{code}</p>
    </div>
  );
}

function ReadyStamp({ ready, empty }: { ready: boolean; empty: boolean }) {
  if (empty) return null;
  return ready ? (
    <span className="-rotate-6 border-[3px] border-leaf bg-paper px-2 py-0.5 font-black text-leaf">IN</span>
  ) : (
    <span className="chip text-xs">Choosing</span>
  );
}

function ShareButtons({ code, host }: { code: string; host: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- origin is only known in the browser
    setUrl(`${window.location.origin}/group/${code}`);
  }, [code]);
  const text = `Canteen? Join ${host}'s table on Rasoi with code ${code}: ${url}`;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a className="btn btn-sm btn-go" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
        Share on WhatsApp
      </a>
      <button
        className="btn btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked */
          }
        }}
      >
        {copied ? "Copied" : "Copy invite"}
      </button>
    </div>
  );
}

function PlateEditor({
  groupId,
  menu,
  mine,
  disabled,
  onError,
}: {
  groupId: string;
  menu: { id: string; name: string; items: MenuItem[] }[];
  mine: Seat["lines"];
  disabled: boolean;
  onError: (m: string | null) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(menu[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const qty = (id: string) => mine.find((l) => l.id === id)?.qty ?? 0;
  const current = menu.find((c) => c.id === tab);

  async function set(itemId: string, n: number) {
    setBusy(itemId);
    onError(null);
    const r = await updatePlate(groupId, itemId, n);
    if (!r.ok) onError(r.message);
    router.refresh();
    setBusy(null);
  }

  return (
    <section aria-labelledby="plate-h" className="panel">
      <div className="border-b-[3px] border-ink px-5 py-3">
        <h2 id="plate-h" className="text-xl font-black">Your plate</h2>
        <p className="text-sm text-muted">Changing your plate asks you to confirm again.</p>
      </div>
      <div role="tablist" aria-label="Menu sections" className="flex gap-2 overflow-x-auto border-b-[3px] border-ink px-4 py-3">
        {menu.map((c) => (
          <button key={c.id} role="tab" aria-selected={c.id === tab} onClick={() => setTab(c.id)} className="chip px-3 py-1.5 text-sm aria-selected:bg-ink aria-selected:text-paper">
            {c.name}
          </button>
        ))}
      </div>
      <ul role="tabpanel" className="grid divide-y-2 divide-ink/15 sm:grid-cols-2 sm:divide-y-0">
        {current?.items.map((i) => {
          const n = qty(i.id);
          return (
            <li key={i.id} className={`flex items-center gap-3 px-5 py-3 sm:border-b-2 sm:border-ink/15 ${n ? "bg-turmeric-soft" : ""}`}>
              <DietMark veg={i.isVeg} size={14} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{i.name}</p>
                <p className="nums text-sm text-muted">{rupees(i.pricePaise)}</p>
              </div>
              {n === 0 ? (
                <button className="btn btn-sm btn-primary" disabled={disabled || busy !== null} onClick={() => set(i.id, 1)}>
                  {busy === i.id ? "…" : "Add"}
                </button>
              ) : (
                <Stepper qty={n} label={i.name} onChange={(next) => busy === null && set(i.id, next)} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HostPanel({
  groupId,
  slots,
  waitingOn,
  canPlace,
  total,
  pending,
  act,
  router,
}: {
  groupId: string;
  slots: SlotView[];
  waitingOn: string[];
  canPlace: boolean;
  total: number;
  pending: boolean;
  act: (fn: () => Promise<{ ok: boolean; message?: string; orderId?: string }>, after?: () => void) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [slot, setSlot] = useState<string>("");
  const [note, setNote] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const chosen = slots.find((s) => s.at === slot && !s.full);

  return (
    <div className="panel space-y-4 p-5">
      <h2 className="text-lg font-black">Place the table order</h2>
      <div>
        <label className="label" htmlFor="slot">Pickup time</label>
        <select id="slot" className="field" value={slot} onChange={(e) => setSlot(e.target.value)}>
          <option value="">Pick a time</option>
          {slots.map((s) => (
            <option key={s.at} value={s.at} disabled={s.full}>
              {s.label}{s.full ? " (full)" : ""}
            </option>
          ))}
        </select>
        {slots.length === 0 && <p className="mt-1 text-sm font-bold text-chilli">No pickup times left today.</p>}
      </div>
      <div>
        <label className="label" htmlFor="tnote">Note for the kitchen <span className="font-medium text-muted">(optional)</span></label>
        <input id="tnote" className="field" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Serve together, extra plates…" />
      </div>
      {waitingOn.length > 0 && (
        <p className="border-[3px] border-ink bg-turmeric-soft px-3 py-2 text-sm font-bold">Waiting for {waitingOn.join(", ")} to tap I&rsquo;m in.</p>
      )}
      <button
        className="btn btn-primary btn-lg w-full"
        disabled={pending || !canPlace || !chosen}
        onClick={() =>
          act(async () => {
            const r = await placeTableOrder(groupId, chosen!.at, note);
            if (r.ok) router.push(`/orders/${r.orderId}?placed=1`);
            return r;
          })
        }
      >
        {pending ? "Placing…" : `Place order for ${rupees(total)}`}
      </button>
      {confirmClose ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold">Close the table for everyone?</span>
          <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => act(() => close(groupId), () => router.push("/group"))}>Close table</button>
          <button className="btn btn-sm" onClick={() => setConfirmClose(false)}>Keep it</button>
        </div>
      ) : (
        <button className="text-sm font-bold underline decoration-2 underline-offset-4" onClick={() => setConfirmClose(true)}>Close table</button>
      )}
    </div>
  );
}
