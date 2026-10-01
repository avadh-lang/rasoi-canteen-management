import type { Metadata } from "next";
import { PageTitle } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";
import { NewStaffForm, UserControls } from "./user-controls";

export const metadata: Metadata = { title: "People" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, me] = await Promise.all([searchParams, requireUser("ADMIN")]);
  const term = q.trim();
  const users = await db.user.findMany({
    where: term
      ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, { rollNo: { contains: term, mode: "insensitive" } }] }
      : {},
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { orders: true } } },
    take: 200,
  });

  return (
    <>
      <PageTitle title="People">Students, staff and their access. Switched-off accounts are signed out on their next click.</PageTitle>
      <div className="grid items-start gap-8 xl:grid-cols-[1fr_360px]">
        <section className="panel overflow-x-auto" aria-label="Accounts">
          <form className="flex gap-2 border-b-[3px] border-ink p-3">
            <label className="sr-only" htmlFor="q">Search people</label>
            <input id="q" name="q" defaultValue={term} className="field" placeholder="Name, email or roll no." />
            <button className="btn">Search</button>
          </form>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b-2 border-ink bg-steel/40">
              <tr>
                <th className="px-4 py-2">Person</th>
                <th className="px-4 py-2">Roll no.</th>
                <th className="px-4 py-2 text-right">Wallet</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/15">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "bg-steel/40 text-muted"}>
                  <td className="px-4 py-2">
                    <span className="block font-bold">{u.name}{u.id === me.id && " (you)"}</span>
                    <span className="block text-xs">{u.email}</span>
                  </td>
                  <td className="nums px-4 py-2">{u.rollNo ?? "–"}</td>
                  <td className="nums px-4 py-2 text-right">{u.role === "CUSTOMER" ? rupees(u.walletBalance) : "–"}</td>
                  <td className="nums px-4 py-2 text-right">{u._count.orders}</td>
                  <UserControls id={u.id} role={u.role} active={u.active} self={u.id === me.id} />
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-5 text-muted">No one matches &ldquo;{term}&rdquo;.</p>}
        </section>
        <NewStaffForm />
      </div>
    </>
  );
}
