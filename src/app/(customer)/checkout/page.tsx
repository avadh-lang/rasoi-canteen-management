import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { upcomingSlots } from "@/lib/domain/slots";
import { slotBookings } from "@/server/orders";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("CUSTOMER");
  const now = new Date();
  const [settings, items] = await Promise.all([
    getSettings(),
    db.menuItem.findMany({ select: { id: true, prepMinutes: true, isAvailable: true, stock: true, pricePaise: true, name: true } }),
  ]);
  // Slots with no lead time; the form trims them to the tray's prep time.
  const slots = upcomingSlots(now, settings, 0, await slotBookings(db, now));

  return (
    <CheckoutForm
      now={now.getTime()}
      walletPaise={user.walletBalance}
      taxBasisPoints={settings.taxBasisPoints}
      acceptingOrders={settings.acceptingOrders}
      slots={slots.map((s) => ({ at: s.startsAt.getTime(), label: s.label, remaining: s.remaining, capacity: settings.slotCapacity }))}
      catalog={Object.fromEntries(items.map((i) => [i.id, i]))}
    />
  );
}
