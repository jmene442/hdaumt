"use client";

// Small client wrapper because next-auth's signOut() must run in a client
// component (it triggers a browser redirect/fetch), unlike auth()/signIn's
// server-side link form used elsewhere.
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button onClick={() => signOut()} className="text-sm text-zinc-600 underline dark:text-zinc-400">
      Sign out
    </button>
  );
}
