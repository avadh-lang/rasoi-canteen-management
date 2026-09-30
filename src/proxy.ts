import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME, type Role } from "./lib/domain/constants";
import { readSession, SESSION_COOKIE } from "./lib/session-token";

// Optimistic route guard. Pages and actions still re-check against the database.
const AREAS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/kitchen", roles: ["KITCHEN", "ADMIN"] },
  { prefix: "/counter", roles: ["CASHIER", "ADMIN"] },
  { prefix: "/menu", roles: ["CUSTOMER"] },
  { prefix: "/checkout", roles: ["CUSTOMER"] },
  { prefix: "/orders", roles: ["CUSTOMER"] },
  { prefix: "/wallet", roles: ["CUSTOMER"] },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" || pathname === "/register") {
    return session ? NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url)) : NextResponse.next();
  }

  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area) return NextResponse.next();

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!area.roles.includes(session.role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
