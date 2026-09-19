// Turns a chord symbol like "Cmaj7" or "Bbm7" into a set of actual pitches,
// so chart-to-abc.ts can notate real chord tones instead of just printing
// the symbol as text. Only lib/chart-to-abc.ts depends on this module.

/** Semitone offset of each natural note name above C, used as the base before accidentals. */
const NATURAL_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Interval sets (semitones above the root) for every chord quality we recognize. */
const QUALITY_INTERVALS: Array<{ pattern: RegExp; intervals: number[] }> = [
  // Longest/most-specific patterns first so e.g. "maj7" doesn't get matched by "maj" (major).
  { pattern: /^(maj7|M7|Δ7?)$/, intervals: [0, 4, 7, 11] },
  { pattern: /^(m7b5|m7-5|ø7?)$/, intervals: [0, 3, 6, 10] },
  { pattern: /^(dim7|o7)$/, intervals: [0, 3, 6, 9] },
  { pattern: /^(dim|o)$/, intervals: [0, 3, 6] },
  { pattern: /^(m6|min6|-6)$/, intervals: [0, 3, 7, 9] },
  { pattern: /^(m7|min7|-7)$/, intervals: [0, 3, 7, 10] },
  { pattern: /^(m9|min9)$/, intervals: [0, 3, 7, 10, 14] },
  { pattern: /^(m|min|-)$/, intervals: [0, 3, 7] },
  { pattern: /^(maj9|M9)$/, intervals: [0, 4, 7, 11, 14] },
  { pattern: /^(add9)$/, intervals: [0, 4, 7, 14] },
  { pattern: /^(9)$/, intervals: [0, 4, 7, 10, 14] },
  { pattern: /^(7)$/, intervals: [0, 4, 7, 10] },
  { pattern: /^(6)$/, intervals: [0, 4, 7, 9] },
  { pattern: /^(aug|\+)$/, intervals: [0, 4, 8] },
  { pattern: /^(sus2)$/, intervals: [0, 2, 7] },
  { pattern: /^(sus4|sus)$/, intervals: [0, 5, 7] },
  { pattern: /^(maj|M|)$/, intervals: [0, 4, 7] },
];

/** Root + fifth only — used when a quality string doesn't match anything above. */
const FALLBACK_INTERVALS = [0, 7];

export interface ParsedChord {
  /** Absolute semitone offsets from middle C (0 = middle C), one per chord tone, root first. */
  semitones: number[];
  /** Whether the quality string was recognized (false means the power-chord fallback was used). */
  recognized: boolean;
}

/**
 * Parses a chord symbol (e.g. "F#m7", "Bb", "G/B") into chord-tone semitone
 * offsets anchored near middle C. Slash-chord bass notes are parsed but
 * intentionally ignored for now — voicing always starts from the root,
 * since the chart layer only has one voice (no separate bass part yet).
 */
export function parseChordSymbol(symbol: string): ParsedChord {
  const trimmed = symbol.trim().split("/")[0]; // drop "/bass" if present
  const match = trimmed.match(/^([A-G])(#|b)?(.*)$/);
  if (!match) {
    // Completely unparseable input — anchor on middle C so rendering never throws.
    return { semitones: [0, 7], recognized: false };
  }

  const [, letter, accidental, qualityRaw] = match;
  let rootSemitone = NATURAL_SEMITONES[letter];
  if (accidental === "#") rootSemitone += 1;
  if (accidental === "b") rootSemitone -= 1;
  rootSemitone = ((rootSemitone % 12) + 12) % 12;

  const quality = qualityRaw.trim();
  const found = QUALITY_INTERVALS.find((q) => q.pattern.test(quality));
  const intervals = found ? found.intervals : FALLBACK_INTERVALS;

  return {
    semitones: intervals.map((i) => rootSemitone + i),
    recognized: Boolean(found),
  };
}

const CHROMATIC_SHARPS = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];

/**
 * Converts one absolute semitone offset from middle C into ABC pitch
 * notation (e.g. 0 -> "c", -1 -> "B", 11 -> "b", 12 -> "c'"). Always spells
 * accidentals as sharps for simplicity — enharmonically "wrong" spellings
 * (e.g. ^C instead of _D) are a known v1 simplification, not a bug.
 */
export function semitoneToAbcPitch(semitoneFromMiddleC: number): string {
  const octaveShift = Math.floor(semitoneFromMiddleC / 12);
  const pitchClass = ((semitoneFromMiddleC % 12) + 12) % 12;
  const spelled = CHROMATIC_SHARPS[pitchClass];
  const accidental = spelled.length === 2 ? spelled[0] : "";
  const letter = spelled.length === 2 ? spelled[1] : spelled;

  if (octaveShift >= 0) {
    return accidental + letter.toLowerCase() + "'".repeat(octaveShift);
  }
  return accidental + letter.toUpperCase() + ",".repeat(-octaveShift - 1);
}
