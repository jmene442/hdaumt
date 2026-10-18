# Progress so far

A plain-language log of what's been set up, for anyone (including future you) catching up.

## What the app does

You write songs. Each song has sections (verse, chorus, etc.) made of bars, and each bar can
have one or more chords. You can type a plain-English request ("an 8-bar chorus in G major")
and the app asks Claude to suggest chords/sections for you, which get added to the song. The
notation is rendered on screen using standard musical notation (via abcjs).

## What's working right now

- **Database**: Songs are stored in MongoDB (a free Atlas cluster). Connection is live and
  tested.
- **AI suggestions**: Hooked up to the Anthropic API. Given a song's key/time signature and a
  freeform prompt, it proposes new sections as structured chords — never raw text, so the app
  never has to "trust" what comes back.
- **Sign-in**: Google sign-in via Auth.js/NextAuth. Sessions are stored in MongoDB too.
- **Invite-only access**: Even though sign-in uses Google, only a specific list of email
  addresses (set in `ALLOWED_EMAILS`) are actually let in. Anyone else gets turned away at
  login with a message explaining the app is invite-only.
- **Pages**:
  - `/login` — sign-in page.
  - `/` — dashboard. Shows a table of your songs (title, key, time signature, section/bar
    counts, last updated), plus a text box to describe a new song, which creates it and asks
    the AI to fill in a starting chart.
  - `/songs/[id]` — the editor for one song: edit sections/bars/chords by hand, see the
    rendered notation update live, and ask the AI for more sections.
- **Hosting**: The project is linked to Vercel, connected to this GitHub repo so pushes can
  trigger deployments. All the secrets above (database URL, API key, etc.) are already stored
  in Vercel, split between Production and Preview.

## What's not done yet

- **No deploy yet** — the Vercel project is set up and wired to this repo, but a first deploy
  hasn't actually been run.
- **Google OAuth redirect URI for production** — once there's a live domain (even the default
  `*.vercel.app` one), that domain's callback URL needs to be added in Google Cloud Console
  alongside the `localhost` one, or sign-in will fail in production.
- **Custom domain** — not yet purchased/connected.
- **MIDI export / audio** — intentionally out of scope for now (see `CLAUDE.md`).
