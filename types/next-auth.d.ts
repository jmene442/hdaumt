// Adds `id` to the built-in Session["user"] type, matching the id we copy
// onto it in auth.ts's session callback. Without this, TypeScript doesn't
// know session.user.id exists.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
