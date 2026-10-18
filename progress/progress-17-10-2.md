# Progress update

Continuing from `progress-17-10.md`. A plain-language log of what's happened since.

## What changed

- **Invite-only access went live.** The allowlist change (`ALLOWED_EMAILS`) was committed,
  opened as a PR, and merged into `main` — rather than pushed straight to `main` like earlier
  changes, since it affects who can get into the app at all.
- **First production deploy actually happened.** Merging that PR triggered Vercel to deploy
  to production for the first time. The app is live at a `*.vercel.app` URL.
- **MongoDB's network settings had to be opened up.** Atlas was only allowing connections
  from one home computer's IP address. Vercel doesn't run from a fixed IP, so that had to be
  changed to "allow from anywhere" — the database's username/password are still what
  actually protects it, this setting only controls which network locations are allowed to
  even attempt a connection.
- **Bought a domain: hdaumt.fyi.** The original pick, hdaumt.io, was already owned by someone
  else. Bought the new one directly through Vercel, so Vercel manages it automatically once
  it finishes propagating (no manual DNS setup needed) — still waiting on that as of this
  update.
- **Tested sign-in for real, both ways:**
  - Signed in with an approved email → landed on the "Your songs" dashboard successfully.
    This proved Google sign-in, the invite-only check, and the database connection were all
    actually working together in production, not just in theory.
  - Signed in with a different (non-approved) email → got turned away with the "this app is
    invite-only" message, confirming random people can't just sign up.

## What's still open

- **The AI "create a song from a prompt" feature hasn't been tried on the live site yet** —
  only confirmed locally so far. Worth testing the same way MongoDB was: don't assume it
  works in production just because it worked on a laptop.
- **hdaumt.fyi domain**: waiting for it to finish connecting. Once it's live, Google sign-in
  needs to be told about that new address too (one more small config step).
- Same remaining items as before: no backups on the free database tier, no MIDI/audio
  export (intentionally not part of this build).
