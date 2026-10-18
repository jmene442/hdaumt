// Batched log forwarding to Datadog (US1) — the app's primary observability
// tool; Vercel is used for hosting/deploys only, not its own log viewer.
// Each request gets its own AsyncLocalStorage-scoped batch: Fluid Compute
// can reuse one warm instance across *concurrent* requests, so a plain
// module-level array would interleave log lines from different requests.
// withLogging() opens that scope, auto-logs the request's start/end, and
// flushes the whole batch in one HTTP call via Next's after() so the
// response is never held up waiting on the network round-trip to Datadog.
import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";

const DATADOG_SITE = process.env.DATADOG_SITE || "datadoghq.com";
const SERVICE = "hdaumt";

interface LogEvent {
  message: string;
  level: "info" | "warn" | "error";
  [key: string]: unknown;
}

const batchStorage = new AsyncLocalStorage<LogEvent[]>();

async function send(batch: LogEvent[]) {
  const apiKey = process.env.DATADOG_API_KEY;
  if (!apiKey || batch.length === 0) return;
  try {
    await fetch(`https://http-intake.logs.${DATADOG_SITE}/api/v2/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "DD-API-KEY": apiKey },
      body: JSON.stringify(
        batch.map((entry) => ({
          ddsource: "vercel",
          service: SERVICE,
          ddtags: `env:${process.env.VERCEL_ENV ?? "development"}`,
          ...entry,
        })),
      ),
    });
  } catch (err) {
    // Best-effort: a Datadog outage should never break the app itself.
    console.error("[datadog] log flush failed", err);
  }
}

/** Queues one log event on the current request's batch, or ships it immediately if called outside a request (e.g. a background task). */
export function logEvent(
  message: string,
  fields: Record<string, unknown> = {},
  level: LogEvent["level"] = "info",
) {
  const entry: LogEvent = { message, level, ...fields };
  const batch = batchStorage.getStore();
  if (batch) {
    batch.push(entry);
    return;
  }
  // Called outside withLogging()'s batch (e.g. the NextAuth signIn callback) —
  // still within a request, so defer via after() the same way; fall back to
  // a bare fire-and-forget fetch if after() isn't usable in this context.
  try {
    after(() => send([entry]));
  } catch {
    void send([entry]);
  }
}

/**
 * Wraps a Next.js API route handler: opens a per-request log batch, records
 * request.start/request.end automatically (method, path, status, duration),
 * logs uncaught errors (then rethrows so Next's normal error handling still
 * applies), and flushes the batch via after() once the response is ready.
 */
export function withLogging<Args extends unknown[]>(
  routeName: string,
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    const batch: LogEvent[] = [];
    return batchStorage.run(batch, async () => {
      const start = Date.now();
      const path = new URL(request.url).pathname;
      logEvent("request.start", { route: routeName, method: request.method, path });
      try {
        const response = await handler(request, ...args);
        logEvent("request.end", {
          route: routeName,
          method: request.method,
          path,
          status: response.status,
          durationMs: Date.now() - start,
        });
        return response;
      } catch (err) {
        logEvent(
          "request.error",
          { route: routeName, method: request.method, path, error: err instanceof Error ? err.message : String(err) },
          "error",
        );
        throw err;
      } finally {
        after(() => send(batch));
      }
    });
  };
}
