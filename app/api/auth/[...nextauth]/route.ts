// Catch-all route Auth.js needs to serve its own endpoints (sign-in,
// sign-out, callback, session, CSRF). Just re-exports the handlers built in
// auth.ts — no logic lives here.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
