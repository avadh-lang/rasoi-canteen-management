import type { Metadata } from "next";
import { PageTitle } from "@/components/app-shell";
import { getSettings } from "@/lib/db";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <PageTitle title="Settings">Opening hours, pickup slots and tax. Existing orders keep the rules they were placed under.</PageTitle>
      <SettingsForm
        values={{
          open: hhmm(s.openMinute),
          close: hhmm(s.closeMinute),
          slotMinutes: s.slotMinutes,
          slotCapacity: s.slotCapacity,
          acceptingOrders: s.acceptingOrders,
          taxPercent: s.taxBasisPoints / 100,
        }}
      />
    </>
  );
}
