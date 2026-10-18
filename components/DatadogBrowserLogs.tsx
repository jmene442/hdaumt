"use client";

// Initializes Datadog browser logging. Mounted with no `user` prop in
// app/layout.tsx so init() always runs once per page load; mounted again
// with a `user` prop from pages that already fetch the session (e.g.
// app/page.tsx) to attach identity once it's known. init() is guarded by
// a module-level flag so re-mounting this component elsewhere never
// re-initializes the SDK.
import { useEffect } from "react";
import { datadogLogs } from "@datadog/browser-logs";

let initialized = false;

function init() {
  if (initialized) return;
  // No client token configured (e.g. local dev without .env.local set up) —
  // skip rather than let the SDK throw, same fallback lib/datadog.ts uses
  // server-side for a missing DATADOG_API_KEY.
  const clientToken = process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN;
  if (!clientToken) return;
  initialized = true;
  datadogLogs.init({
    clientToken,
    site: process.env.NEXT_PUBLIC_DATADOG_SITE || "datadoghq.com",
    service: "hdaumt",
    env: process.env.NODE_ENV === "production" ? "production" : "development",
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
  });
}

interface DatadogBrowserLogsProps {
  user?: { id: string; email?: string | null };
}

export default function DatadogBrowserLogs({ user }: DatadogBrowserLogsProps) {
  // Runs once per mount, regardless of `user` — this is what actually
  // starts log collection (including forwarded console/window errors).
  useEffect(() => {
    init();
  }, []);

  // Separate effect keyed on the primitive fields (not the `user` object
  // itself) so passing a freshly-created object literal each render doesn't
  // call setUser() on every re-render.
  useEffect(() => {
    if (!user) return;
    datadogLogs.setUser({ id: user.id, email: user.email ?? undefined });
  }, [user?.id, user?.email]);

  return null;
}
