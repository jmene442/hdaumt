// Route guard: keeps the song dashboard, editor, and songs API behind
// Google sign-in. Next.js 16 renamed middleware.ts -> proxy.ts (same
// mechanism), so this runs on every request matching `proxyConfig.matcher`.
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const wantsProtectedRoute =
    req.nextUrl.pathname.startsWith("/songs") ||
    req.nextUrl.pathname.startsWith("/api/songs");

  if (wantsProtectedRoute && !isLoggedIn) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const proxyConfig = {
  matcher: ["/songs/:path*", "/api/songs/:path*"],
};
