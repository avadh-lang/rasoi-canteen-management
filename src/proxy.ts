import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "./lib/session-token";

// Optimistic gate: bounce signed-out visitors to sign-in before rendering.
// Role checks live in each area's layout, which reads the role from the
// database, so a role change or deactivation applies on the very next request.
const PROTECTED = ["/admin", "/kitchen", "/counter", "/menu", "/checkout", "/orders", "/wallet", "/group"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
