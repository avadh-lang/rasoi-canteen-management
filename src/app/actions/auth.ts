"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRole, ROLE_HOME } from "@/lib/domain/constants";
import { firstError, loginSchema, registerSchema, type ActionState } from "@/lib/validation";
import { audit } from "@/server/audit";

// Simple in-memory brute-force guard: 5 failed attempts per email per 10 minutes.
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 10 * 60_000;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function locked(email: string) {
  const f = failures.get(email);
  return f && f.count >= 5 && f.until > Date.now();
}
function recordFailure(email: string) {
  const f = failures.get(email);
  const fresh = !f || f.until < Date.now();
  failures.set(email, { count: fresh ? 1 : f.count + 1, until: Date.now() + WINDOW_MS });
}

function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { email, password } = parsed.data;

  if (locked(email)) return { ok: false, message: "Too many attempts. Wait 10 minutes and try again." };

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !valid || !isRole(user.role)) {
    recordFailure(email);
    return { ok: false, message: "That email and password don't match." };
  }
  if (!user.active) return { ok: false, message: "This account is switched off. Ask the canteen manager." };

  failures.delete(email);
  await startSession({ id: user.id, role: user.role, name: user.name });
  await db.$transaction((tx) => audit(tx, { actorId: user.id, action: "auth.login", entity: "User", entityId: user.id }));

  const home = ROLE_HOME[user.role];
  redirect(user.role === "CUSTOMER" ? safeNext(formData.get("next"), home) : home);
}

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { name, email, rollNo, password } = parsed.data;

  const clash = await db.user.findFirst({ where: { OR: [{ email }, ...(rollNo ? [{ rollNo }] : [])] } });
  if (clash) {
    return { ok: false, message: clash.email === email ? "That email already has an account. Sign in instead." : "That roll number is already registered." };
  }

  const user = await db.user.create({
    data: { name, email, rollNo: rollNo ?? null, passwordHash: await bcrypt.hash(password, 10), role: "CUSTOMER" },
  });
  await db.$transaction((tx) => audit(tx, { actorId: user.id, action: "auth.register", entity: "User", entityId: user.id }));
  await startSession({ id: user.id, role: "CUSTOMER", name: user.name });
  redirect("/menu");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
