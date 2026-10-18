// Shared TypeScript shapes for the chart layer (the harmonic outline of a
// song: sections -> bars -> chords). See CLAUDE.md's Data Model section for
// why the performance layer (per-instrument notes) is intentionally absent
// here — it's a separate, not-yet-built layer.

export interface Chord {
  id: string;
  /** Chord symbol as typed by the user or proposed by the AI, e.g. "Cmaj7", "G/B". */
  symbol: string;
  /** 1-indexed position within the bar; may be fractional (e.g. 2.5 = the "and" of beat 2). */
  beat: number;
}

export interface Bar {
  id: string;
  order: number;
  /** Overrides the song's defaultTimeSignature for just this bar; null = inherit. */
  timeSignature: string | null;
  chords: Chord[];
}

export interface Section {
  id: string;
  name: string;
  order: number;
  bars: Bar[];
}

export interface Song {
  _id: string;
  userId: string;
  title: string | null;
  /** Freeform summary shown above the sheet music — defaults to the creation prompt, user-editable after. */
  description: string | null;
  key: string | null;
  defaultTimeSignature: string;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

/** The subset of Song fields a client sends when creating/updating a song. */
export type SongInput = Pick<Song, "title" | "description" | "key" | "defaultTimeSignature" | "sections">;
