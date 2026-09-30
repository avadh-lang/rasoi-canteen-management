import Link from "next/link";
import { LiveRefresh } from "@/components/live-refresh";
import { Wordmark } from "@/components/marks";
import { getCurrentUser } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { ROLE_HOME } from "@/lib/domain/constants";
import { isOpenNow } from "@/lib/domain/slots";
import { businessDate, minuteLabel } from "@/lib/domain/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, settings, ready, cooking] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    db.order.findMany({
      where: { businessDate: businessDate(), status: "READY" },
      orderBy: { readyAt: "desc" },
      select: { token: true },
      take: 8,
    }),
    db.order.count({ where: { businessDate: businessDate(), status: { in: ["PLACED", "PREPARING"] } } }),
  ]);
  const open = isOpenNow(new Date(), settings);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-4 py-5 sm:px-6">
        <Wordmark />
        <span className={`chip ${open ? "bg-leaf-soft" : "bg-chilli-soft"}`}>
          {open ? "Open now" : "Closed"}, {minuteLabel(settings.openMinute)} to {minuteLabel(settings.closeMinute)}
        </span>
        <div className="ml-auto">
          {user ? (
            <Link href={ROLE_HOME[user.role]} className="btn btn-sm btn-ink">Go to my dashboard</Link>
          ) : (
            <Link href="/login" className="btn btn-sm">Sign in</Link>
          )}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-12 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <p className="font-bold">VCET canteen, Vasai</p>
          <h1 className="display mt-3 text-[3.4rem] sm:text-[5.2rem]">
            Order ahead.
            <br />
            Skip the line.
          </h1>
          <p className="mt-6 max-w-md text-lg">
            Pick your food and a pickup time between lectures. Pay from your canteen wallet, then collect when your
            token shows up on the board.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? ROLE_HOME[user.role] : "/register"} className="btn btn-primary btn-lg">
              {user ? "Open Rasoi" : "Create student account"}
            </Link>
            {!user && (
              <Link href="/login" className="btn btn-lg">
                Sign in
              </Link>
            )}
          </div>

          <ol className="mt-12 grid max-w-xl gap-4 sm:grid-cols-3">
            {[
              ["Pick", "Browse today's menu and fill your tray."],
              ["Pay", "Wallet or UPI. You get a token number."],
              ["Collect", "Walk up when your token turns green."],
            ].map(([title, body], i) => (
              <li key={title} className="border-l-[3px] border-ink pl-3">
                <span className="display nums text-2xl">{i + 1}</span>
                <p className="mt-1 font-extrabold">{title}</p>
                <p className="text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The counter display board, as seen above the pickup window. */}
        <section aria-labelledby="board" className="panel shadow-hard-lg">
          <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-5 py-3 text-paper">
            <h2 id="board" className="display text-xl">Now serving</h2>
            <LiveRefresh everyMs={8000} />
          </div>
          <div className="grid min-h-64 auto-rows-min grid-cols-2 content-start gap-3 bg-leaf-soft p-5 sm:grid-cols-4">
            {ready.length === 0 && (
              <p className="col-span-full self-center text-center font-bold">No tokens waiting at the counter.</p>
            )}
            {ready.map((o) => (
              <div key={o.token} className="grid place-items-center border-[3px] border-ink bg-paper py-4 shadow-hard-sm">
                <span className="display nums text-4xl">{o.token}</span>
              </div>
            ))}
          </div>
          <p className="border-t-[3px] border-ink px-5 py-3 text-sm font-bold">
            {cooking === 0 ? "Kitchen is clear." : `${cooking} ${cooking === 1 ? "order" : "orders"} on the stove.`}
          </p>
        </section>
      </main>
    </div>
  );
}
