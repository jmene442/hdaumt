"use client";

// Client wrapper for next-auth's signIn(), used on the logged-out homepage
// instead of a plain link to /api/auth/signin (which Next's linter flags
// and which skips the client-side redirect handling signIn() provides).
import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
    >
      Sign in with Google
    </button>
  );
}
