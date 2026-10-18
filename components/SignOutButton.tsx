"use client";

// Small client wrapper because next-auth's signOut() must run in a client
// component (it triggers a browser redirect/fetch), unlike auth()/signIn's
// server-side link form used elsewhere.
import { signOut } from "next-auth/react";
import Button from "./ui/Button";

export default function SignOutButton() {
  return (
    <Button variant="dark" onClick={() => signOut()}>
      Sign out
    </Button>
  );
}
