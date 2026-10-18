// Central Auth.js config: wires up Google sign-in and persists sessions/
// accounts in MongoDB. Every other file that needs the session (API routes,
// server components, the proxy route guard) imports from here rather than
// re-configuring NextAuth.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

/** This is an invite-only app — ALLOWED_EMAILS is the full allowlist, not a starter set. */
function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Rejecting here (rather than after the adapter persists a user/session)
    // keeps anyone off the allowlist from ever getting a DB user created for
    // them at all — Auth.js redirects them to /login?error=AccessDenied.
    signIn({ user }) {
      return isAllowedEmail(user.email);
    },
    // The database session strategy gives us the persisted `user` record but
    // doesn't copy its id onto `session.user` by default — every API route
    // that scopes data by userId needs it there.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
