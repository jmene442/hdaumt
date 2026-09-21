"use client";

// Client wrapper for next-auth's signIn(), used on /login instead of a plain
// link to /api/auth/signin (which Next's linter flags and which skips the
// client-side redirect handling signIn() provides). Forwards callbackUrl so
// proxy.ts's redirect-back-after-login flow works.
import { signIn } from "next-auth/react";

export default function SignInButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: callbackUrl || "/" })}
      className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
    >
      Sign in with Google
    </button>
  );
}
