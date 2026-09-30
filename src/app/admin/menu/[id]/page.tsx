import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/app-shell";
import { db } from "@/lib/db";
import { ItemForm } from "../item-form";

export const metadata: Metadata = { title: "Edit dish" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, categories] = await Promise.all([
    db.menuItem.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!item) notFound();
  return (
    <>
      <PageTitle title={`Edit ${item.name}`}>Past orders keep the name and price they were sold at.</PageTitle>
      <ItemForm item={item} categories={categories} />
    </>
  );
}
