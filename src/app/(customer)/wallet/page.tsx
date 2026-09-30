import type { Metadata } from "next";
import { PageTitle } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/domain/constants";
import { timeLabel } from "@/lib/domain/time";
import { rupees } from "@/lib/money";
import { TopUp } from "./top-up";

export const metadata: Metadata = { title: "Wallet" };

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const TYPE_LABEL: Record<string, string> = { TOPUP: "Top-up", PAYMENT: "Paid", REFUND: "Refund" };

export default async function WalletPage() {
  const user = await requireUser("CUSTOMER");
  const txns = await db.walletTxn.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40 });

  return (
    <>
      <PageTitle title="Wallet">
        Prepaid canteen balance. Pay in one tap, get instant refunds on cancelled orders.
      </PageTitle>
      <div className="grid items-start gap-8 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <div className="panel bg-turmeric p-6 shadow-hard-lg">
            <p className="font-bold">Balance</p>
            <p className="display nums mt-1 text-6xl">{rupees(user.walletBalance)}</p>
            <p className="mt-3 text-sm">
              {user.rollNo ? `Roll no. ${user.rollNo}. ` : ""}The counter can also top up with cash if you give them this number.
            </p>
          </div>
          <TopUp min={LIMITS.minTopUpPaise / 100} max={LIMITS.maxTopUpPaise / 100} />
        </div>

        <section className="panel" aria-labelledby="ledger-h">
          <h2 id="ledger-h" className="border-b-[3px] border-ink px-5 py-3 text-xl font-black">History</h2>
          {txns.length === 0 ? (
            <p className="p-5 text-muted">No transactions yet. Top up to start ordering from your wallet.</p>
          ) : (
            <ul className="divide-y-2 divide-ink/15">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <span className={`chip w-20 justify-center ${t.amountPaise > 0 ? "bg-leaf-soft" : ""}`}>{TYPE_LABEL[t.type] ?? t.type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{t.reference}</p>
                    <p className="nums text-xs text-muted">{dateFmt.format(t.createdAt)}, {timeLabel(t.createdAt)}</p>
                  </div>
                  <div className="nums text-right">
                    <p className={`font-black ${t.amountPaise > 0 ? "text-leaf" : ""}`}>
                      {t.amountPaise > 0 ? "+" : "−"}{rupees(Math.abs(t.amountPaise))}
                    </p>
                    <p className="text-xs text-muted">Bal. {rupees(t.balanceAfter)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
