"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";
import { isRole } from "@/lib/domain/constants";
import { firstError, menuItemSchema, settingsSchema, staffSchema, type ActionState } from "@/lib/validation";
import { audit } from "@/server/audit";
import { messageFor } from "@/server/errors";

function menuData(formData: FormData) {
  const raw = Object.fromEntries(formData);
  return menuItemSchema.safeParse({
    ...raw,
    isVeg: raw.isVeg === "on",
    isAvailable: raw.isAvailable === "on",
    trackStock: raw.trackStock === "on",
  });
}

export async function saveMenuItem(_: ActionState, formData: FormData): Promise<ActionState> {
  let target = "/admin/menu";
  try {
    const admin = await assertRole("ADMIN");
    const parsed = menuData(formData);
    if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
    const d = parsed.data;
    const data = {
      name: d.name,
      description: d.description,
      pricePaise: Math.round(d.price * 100),
      categoryId: d.categoryId,
      isVeg: d.isVeg,
      isAvailable: d.isAvailable,
      stock: d.trackStock ? d.stock : null,
      prepMinutes: d.prepMinutes,
    };
    const id = formData.get("id");
    await db.$transaction(async (tx) => {
      const item = typeof id === "string" && id
        ? await tx.menuItem.update({ where: { id }, data })
        : await tx.menuItem.create({ data });
      await audit(tx, { actorId: admin.id, action: id ? "menu.updated" : "menu.created", entity: "MenuItem", entityId: item.id, detail: `${item.name} at ${rupees(item.pricePaise)}` });
    });
    revalidatePath("/", "layout");
    target = `/admin/menu?saved=${encodeURIComponent(d.name)}`;
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
  redirect(target);
}

export async function toggleAvailability(id: string, isAvailable: boolean) {
  const admin = await assertRole("ADMIN");
  await db.$transaction(async (tx) => {
    const item = await tx.menuItem.update({ where: { id }, data: { isAvailable } });
    await audit(tx, { actorId: admin.id, action: isAvailable ? "menu.enabled" : "menu.disabled", entity: "MenuItem", entityId: id, detail: item.name });
  });
  revalidatePath("/", "layout");
}

export async function restock(id: string, stock: number | null) {
  const admin = await assertRole("ADMIN");
  const value = stock === null ? null : z.number().int().min(0).max(10_000).parse(stock);
  await db.$transaction(async (tx) => {
    const item = await tx.menuItem.update({ where: { id }, data: { stock: value } });
    await audit(tx, { actorId: admin.id, action: "menu.restocked", entity: "MenuItem", entityId: id, detail: `${item.name} now ${value ?? "made to order"}` });
  });
  revalidatePath("/", "layout");
}

export async function addCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await assertRole("ADMIN");
    const name = z.string().trim().min(2, "Name the section.").max(40).safeParse(formData.get("name"));
    if (!name.success) return { ok: false, message: firstError(name.error) };
    const exists = await db.category.findUnique({ where: { name: name.data } });
    if (exists) return { ok: false, message: "That section already exists." };
    const last = await db.category.aggregate({ _max: { sortOrder: true } });
    await db.$transaction(async (tx) => {
      const c = await tx.category.create({ data: { name: name.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
      await audit(tx, { actorId: admin.id, action: "category.created", entity: "Category", entityId: c.id, detail: c.name });
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `Added ${name.data}.` };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function createStaff(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await assertRole("ADMIN");
    const parsed = staffSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
    const { name, email, role, password } = parsed.data;
    if (await db.user.findUnique({ where: { email } })) return { ok: false, message: "That email already has an account." };
    await db.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) } });
      await audit(tx, { actorId: admin.id, action: "user.created", entity: "User", entityId: u.id, detail: `${email} as ${role}` });
    });
    revalidatePath("/admin/users");
    return { ok: true, message: `${name} can now sign in.` };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function updateUser(id: string, patch: { role?: string; active?: boolean }): Promise<{ ok: boolean; message?: string }> {
  try {
    const admin = await assertRole("ADMIN");
    if (id === admin.id) return { ok: false, message: "You can't change your own role or switch yourself off." };
    if (patch.role !== undefined && !isRole(patch.role)) return { ok: false, message: "Unknown role." };
    await db.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id }, data: patch });
      await audit(tx, { actorId: admin.id, action: "user.updated", entity: "User", entityId: id, detail: `${u.email}${patch.role ? ` is now ${patch.role.toLowerCase()}` : ""}${patch.active === undefined ? "" : patch.active ? " switched on" : " switched off"}` });
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await assertRole("ADMIN");
    const raw = Object.fromEntries(formData);
    const parsed = settingsSchema.safeParse({ ...raw, acceptingOrders: raw.acceptingOrders === "on" });
    if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
    await db.$transaction(async (tx) => {
      await tx.canteenSettings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
      await audit(tx, { actorId: admin.id, action: "settings.updated", entity: "Settings", detail: `${parsed.data.acceptingOrders ? "taking" : "paused"} online orders, ${parsed.data.slotCapacity} per ${parsed.data.slotMinutes}-min slot` });
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved. Customers see the new rules right away." };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}
