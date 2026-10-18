// Next.js runs register() before any other module in the server runtime —
// the one place that's actually guaranteed to execute before things like
// mongodb get imported elsewhere in the app. dd-trace needs to init this
// early or its diagnostics warn that instrumentation may be unreliable.
export async function register() {
  await import("./lib/llm-observability");
}
