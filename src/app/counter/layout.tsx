import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function CounterLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("CASHIER", "ADMIN");
  return <AppShell user={user}>{children}</AppShell>;
}
