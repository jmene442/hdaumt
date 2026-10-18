"use client";

// Client wrapper for next-auth's signIn(), used on /login instead of a plain
// link to /api/auth/signin (which Next's linter flags and which skips the
// client-side redirect handling signIn() provides). Forwards callbackUrl so
// proxy.ts's redirect-back-after-login flow works.
import { signIn } from "next-auth/react";
import Button from "./ui/Button";

export default function SignInButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <Button variant="dark" className="px-4 py-2" onClick={() => signIn("google", { callbackUrl: callbackUrl || "/" })}>
      Sign in with Google
    </Button>
  );
}
