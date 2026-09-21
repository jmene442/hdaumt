// Route guard: keeps the dashboard, song editor, and songs API behind
// Google sign-in. Next.js 16 renamed middleware.ts -> proxy.ts (same
// mechanism), so this runs on every request matching `proxyConfig.matcher`.
// /login itself is intentionally not in the matcher, or this would redirect loop.
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const wantsProtectedRoute =
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname.startsWith("/songs") ||
    req.nextUrl.pathname.startsWith("/api/songs");

  if (wantsProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const proxyConfig = {
  matcher: ["/", "/songs/:path*", "/api/songs/:path*"],
};
