// Initializes Datadog's LLM Observability tracer once per server instance.
// Agentless (no Datadog Agent runs on Vercel), so dd-trace needs an API key —
// it only reads that from the DD_API_KEY env var specifically, so the
// existing DATADOG_API_KEY (already set locally and in Vercel for the other
// Datadog integrations) is copied over rather than requiring a duplicate key.
import tracer from "dd-trace";

if (!process.env.DD_API_KEY) {
  process.env.DD_API_KEY = process.env.DATADOG_API_KEY;
}

tracer.init({
  site: process.env.DATADOG_SITE || "datadoghq.com",
  env: process.env.NODE_ENV === "production" ? "production" : "development",
  llmobs: {
    mlApp: "hdaumt",
    agentlessEnabled: true,
  },
});

/** Manual instrumentation handle — see lib/anthropic.ts for the one call site that uses it. */
export const llmobs = tracer.llmobs;
