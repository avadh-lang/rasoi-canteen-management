import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { isRole, ROLE_HOME, type Role } from "./domain/constants";
import { readSession, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "./session-token";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  rollNo: string | null;
  role: Role;
  walletBalance: number;
};

/**
 * The signed cookie proves who you are; the database decides what you can do.
 * Re-reading the user means a deactivated account or a role change applies
 * on the very next request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active || !isRole(user.role)) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    rollNo: user.rollNo,
    role: user.role,
    walletBalance: user.walletBalance,
  };
});

export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles.length > 0 && !roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

/** For server actions: throws instead of redirecting so the caller can show a message. */
export async function assertRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Your session ended. Sign in again.");
  if (roles.length > 0 && !roles.includes(user.role)) throw new AuthError("Your role can't do that.");
  return user;
}

export class AuthError extends Error {
  name = "AuthError";
}

export async function startSession(user: { id: string; role: Role; name: string }) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
