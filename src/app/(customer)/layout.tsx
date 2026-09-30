import { AppShell } from "@/components/app-shell";
import { CartProvider } from "@/components/cart";
import { requireUser } from "@/lib/auth";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("CUSTOMER");
  return (
    <CartProvider userId={user.id}>
      <AppShell user={user}>{children}</AppShell>
    </CartProvider>
  );
}
