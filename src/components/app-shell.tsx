import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/domain/constants";
import { rupees } from "@/lib/money";
import { Wordmark } from "./marks";
import { NavLinks } from "./nav-links";

const NAV: Record<Role, { href: string; label: string }[]> = {
  CUSTOMER: [
    { href: "/menu", label: "Menu" },
    { href: "/group", label: "Table order" },
    { href: "/orders", label: "My orders" },
    { href: "/wallet", label: "Wallet" },
  ],
  KITCHEN: [{ href: "/kitchen", label: "Order board" }],
  CASHIER: [
    { href: "/counter", label: "Billing" },
    { href: "/counter/pickup", label: "Pickup" },
    { href: "/counter/wallet", label: "Wallet top-up" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/menu", label: "Menu" },
    { href: "/admin/users", label: "People" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/kitchen", label: "Kitchen" },
    { href: "/counter", label: "Counter" },
  ],
};

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="Rasoi home">
            <Wordmark />
          </Link>
          <NavLinks items={NAV[user.role]} />
          <div className="ml-auto flex items-center gap-2">
            {user.role === "CUSTOMER" && (
              <Link href="/wallet" className="chip bg-turmeric-soft nums" title="Wallet balance">
                Wallet {rupees(user.walletBalance)}
              </Link>
            )}
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-sm font-bold">{user.name}</span>
              <span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span>
            </span>
            <form action={logout}>
              <button className="btn btn-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, children, aside }: { title: string; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {children && <p className="mt-2 text-muted">{children}</p>}
      </div>
      {aside}
    </div>
  );
}
