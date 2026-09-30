"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { normaliseCode } from "@/lib/domain/split";
import { messageFor, UserFacingError } from "@/server/errors";
import { closeTable, createTable, joinTable, leaveTable, placeTable, setPlate, setReady } from "@/server/groups";

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  try {
    const user = await assertRole("CUSTOMER");
    const value = await fn(user.id);
    revalidatePath("/", "layout");
    return { ok: true, ...value };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function startTable() {
  return run(async (userId) => ({ code: await createTable(userId) }));
}

export async function joinTableByCode(input: string) {
  return run(async (userId) => {
    const code = normaliseCode(input);
    if (!code) throw new UserFacingError("Table codes are 4 letters, like VADA.");
    return { code: await joinTable(userId, code) };
  });
}

export async function updatePlate(groupId: string, menuItemId: string, qty: number) {
  return run(async (userId) => {
    await setPlate(userId, groupId, menuItemId, z.number().int().min(0).max(20).parse(qty));
    return {};
  });
}

export async function markReady(groupId: string, ready: boolean) {
  return run(async (userId) => {
    await setReady(userId, groupId, ready);
    return {};
  });
}

export async function leave(groupId: string) {
  return run(async (userId) => {
    await leaveTable(userId, groupId);
    return {};
  });
}

export async function close(groupId: string) {
  return run(async (userId) => {
    await closeTable(userId, groupId);
    return {};
  });
}

export async function placeTableOrder(groupId: string, pickupSlotIso: string, note: string) {
  return run(async (userId) => {
    const slot = z.coerce.date().parse(pickupSlotIso);
    const cleanNote = z.string().trim().max(140, "Keep kitchen notes under 140 characters.").parse(note);
    const order = await placeTable(userId, groupId, slot, cleanNote);
    return { orderId: order.id };
  });
}
