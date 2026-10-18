// Turns a chord symbol like "Cmaj7" or "Bbm7" into a set of actual pitches,
// so chart-to-abc.ts can notate real chord tones instead of just printing
// the symbol as text. Also exposes the root/quality split on its own
// (parseChordRoot, describeChordQuality) for lib/chord-theory.ts's hover
// explanations, so both modules parse symbols the same way.

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

/** Interval sets (semitones above the root) and a human label for every chord quality we recognize. */
const QUALITY_INTERVALS: Array<{ pattern: RegExp; intervals: number[]; label: string }> = [
  // Longest/most-specific patterns first so e.g. "maj7" doesn't get matched by "maj" (major).
  { pattern: /^(maj7|M7|Δ7?)$/, intervals: [0, 4, 7, 11], label: "Major 7th" },
  { pattern: /^(m7b5|m7-5|ø7?)$/, intervals: [0, 3, 6, 10], label: "Half-diminished 7th" },
  { pattern: /^(dim7|o7)$/, intervals: [0, 3, 6, 9], label: "Diminished 7th" },
  { pattern: /^(dim|o)$/, intervals: [0, 3, 6], label: "Diminished" },
  { pattern: /^(m6|min6|-6)$/, intervals: [0, 3, 7, 9], label: "Minor 6th" },
  { pattern: /^(m7|min7|-7)$/, intervals: [0, 3, 7, 10], label: "Minor 7th" },
  { pattern: /^(m9|min9)$/, intervals: [0, 3, 7, 10, 14], label: "Minor 9th" },
  { pattern: /^(m|min|-)$/, intervals: [0, 3, 7], label: "Minor" },
  { pattern: /^(maj9|M9)$/, intervals: [0, 4, 7, 11, 14], label: "Major 9th" },
  { pattern: /^(add9)$/, intervals: [0, 4, 7, 14], label: "Added 9th" },
  { pattern: /^(9)$/, intervals: [0, 4, 7, 10, 14], label: "Dominant 9th" },
  { pattern: /^(7)$/, intervals: [0, 4, 7, 10], label: "Dominant 7th" },
  { pattern: /^(6)$/, intervals: [0, 4, 7, 9], label: "Major 6th" },
  { pattern: /^(aug|\+)$/, intervals: [0, 4, 8], label: "Augmented" },
  { pattern: /^(sus2)$/, intervals: [0, 2, 7], label: "Suspended 2nd" },
  { pattern: /^(sus4|sus)$/, intervals: [0, 5, 7], label: "Suspended 4th" },
  { pattern: /^(maj|M|)$/, intervals: [0, 4, 7], label: "Major" },
];

/** Root + fifth only — used when a quality string doesn't match anything above. */
const FALLBACK_INTERVALS = [0, 7];
const FALLBACK_LABEL = "Power chord (unrecognized quality)";

export interface ChordRoot {
  letter: string;
  accidental: "#" | "b" | null;
  /** Everything after the root letter/accidental, e.g. "m7", "maj7", "" for plain major. */
  quality: string;
  /** Root pitch class, 0-11 (0 = C). */
  rootPitchClass: number;
}

/** Splits a chord symbol into its root and quality text. Returns null for unparseable input. */
export function parseChordRoot(symbol: string): ChordRoot | null {
  const trimmed = symbol.trim().split("/")[0]; // drop "/bass" if present
  const match = trimmed.match(/^([A-G])(#|b)?(.*)$/);
  if (!match) return null;

  const [, letter, accidental, qualityRaw] = match;
  let rootSemitone = NATURAL_SEMITONES[letter];
  if (accidental === "#") rootSemitone += 1;
  if (accidental === "b") rootSemitone -= 1;
  rootSemitone = ((rootSemitone % 12) + 12) % 12;

  return {
    letter,
    accidental: accidental === "#" || accidental === "b" ? accidental : null,
    quality: qualityRaw.trim(),
    rootPitchClass: rootSemitone,
  };
}

export interface ChordQuality {
  intervals: number[];
  label: string;
  recognized: boolean;
}

/** Looks up a quality string (e.g. "m7", "maj9") against the known interval/label table. */
export function describeChordQuality(quality: string): ChordQuality {
  const found = QUALITY_INTERVALS.find((q) => q.pattern.test(quality));
  return found
    ? { intervals: found.intervals, label: found.label, recognized: true }
    : { intervals: FALLBACK_INTERVALS, label: FALLBACK_LABEL, recognized: false };
}

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
  const root = parseChordRoot(symbol);
  if (!root) {
    // Completely unparseable input — anchor on middle C so rendering never throws.
    return { semitones: [0, 7], recognized: false };
  }

  const { intervals, recognized } = describeChordQuality(root.quality);
  return {
    semitones: intervals.map((i) => root.rootPitchClass + i),
    recognized,
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
