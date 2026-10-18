# Progress update

Continuing from `progress-18-10.md`, same day. A plain-language log of what's happened since.

## What changed

- **Fixed a recurring production bug: MongoDB connections failing outright**
  (`MongoServerSelectionError: Server selection timed out after 30000 ms`). This is the same
  underlying M0 free-tier flakiness noted in the last update, but worse than expected — it
  wasn't just slow, it was fully timing out. The real cause: the app shares one connection
  attempt across all requests hitting the same warm Vercel instance, and once that single
  attempt timed out, every later request on that instance kept failing too (a failed
  connection attempt can't "retry itself" after the fact). Fix: the connection now retries a
  few times internally, with a shorter 5-second timeout per attempt, before giving up — so one
  slow attempt doesn't take the whole instance down with it.
- **Added Datadog RUM (Real User Monitoring).** Loaded via Datadog's CDN script in
  `app/layout.tsx`, tracking user interactions, page resource loads, long-running tasks, and a
  sampled session replay (20% of sessions, with user input masked for privacy). This is
  separate from both the server-side logging and the browser logging added earlier — RUM is
  specifically about visualizing real user sessions/performance, not just log lines.
- **New release convention: `NEXT_PUBLIC_DD_VERSION`.** This env var tags RUM data with the
  app's release version, so Datadog can show which version a given session/error happened on.
  It needs to be bumped every time a new version tag is cut — bumped to `1.2.0` as part of
  this release.
- **Tagged `v1.2.0`** (minor bump from `v1.1.0` per the project's version-numbering rule) and
  published a matching GitHub Release.

## What's still open

- **`NEXT_PUBLIC_DD_VERSION` only lives in local `.env.local` so far.** Vercel's own
  production environment variables need the same value added for this to actually take effect
  once deployed — not done yet.
- **RUM and browser logs haven't been confirmed to actually arrive in Datadog's UI** from a
  real session yet — only the code/env wiring has been checked.
- The dashboard page (`app/page.tsx`) still doesn't attach signed-in user identity to browser
  logs, unlike the song editor page — noted previously, still not done.
- Same longer-standing items: no backups on the free database tier, no MIDI/audio export
  (intentionally out of scope).
