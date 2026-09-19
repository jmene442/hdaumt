// Central Auth.js config: wires up Google sign-in and persists sessions/
// accounts in MongoDB. Every other file that needs the session (API routes,
// server components, the proxy route guard) imports from here rather than
// re-configuring NextAuth.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

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
  callbacks: {
    // The database session strategy gives us the persisted `user` record but
    // doesn't copy its id onto `session.user` by default — every API route
    // that scopes data by userId needs it there.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
