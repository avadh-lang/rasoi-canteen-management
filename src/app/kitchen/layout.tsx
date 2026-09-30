import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("KITCHEN", "ADMIN");
  return <AppShell user={user}>{children}</AppShell>;
}
