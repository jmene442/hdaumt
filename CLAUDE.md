# Music Composition Generator

A web app for creating and storing original songs. The user writes their own compositions, and the Anthropic API helps generate and suggest musical structure.

## Stack decisions (already made)

- Database: MongoDB, free tier
- Hosting: Vercel, with a cheap custom domain
- Auth: federated login (Google)
- AI: Anthropic API called directly
- Notation UI: abcjs renders traditional notation client-side. The Anthropic API generates ABC notation text and abcjs displays it.
- Implementation: mostly done via Claude Code

## Data model (songs collection)

- Songs are identified by `_id`. `title` is optional metadata. There is no `artist` field, since these are the user's own compositions.
- Structure: song -> sections (verse, chorus, etc.) -> bars.
- Multiple chords can occur within a single bar, so each chord's position/timing within its bar must be tracked.

Two separate layers:

1. Chart layer: chord symbols with bar/beat position. This is a harmonic outline. The Anthropic API generates/suggests this layer (chords, bars, sections).
2. Performance layer: actual per-instrument notes (pitch, start time, duration, velocity). This maps closely to MIDI. It is built separately and is NOT generated directly by the AI.

## Out of scope

- Audio generation (not needed)
- MIDI export: possible future follow-up, not part of the initial build

## Not yet specified (ask before assuming)

- Frontend framework and auth library
- Exact field names and types in the schema
- Prompt design for ABC / chart generation
