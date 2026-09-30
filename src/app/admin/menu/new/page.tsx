import type { Metadata } from "next";
import { PageTitle } from "@/components/app-shell";
import { db } from "@/lib/db";
import { ItemForm } from "../item-form";

export const metadata: Metadata = { title: "Add a dish" };

export default async function NewItemPage() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageTitle title="Add a dish" />
      <ItemForm categories={categories} />
    </>
  );
}
