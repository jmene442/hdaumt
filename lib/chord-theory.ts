// Deterministic (no AI call) music-theory explanations for one chord, shown
// in the hover popover on both the chord-list editor and the rendered sheet
// music (see components/ChordTooltip.tsx). Reuses the same symbol parsing
// as lib/chords.ts (which is what actually voices the notation) so the
// popover never disagrees with what's drawn on the staff.
import { describeChordQuality, parseChordRoot } from "./chords";

const PITCH_CLASS_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Major-scale degree for each semitone distance from the tonic (0 = I). Gaps are non-diatonic. */
const MAJOR_SCALE_DEGREES: Record<number, string> = {
  0: "I",
  2: "ii",
  4: "iii",
  5: "IV",
  7: "V",
  9: "vi",
  11: "vii°",
};

export interface ChordExplanation {
  symbol: string;
  root: string;
  /** e.g. "Dominant 7th" */
  qualityLabel: string;
  /** Note names making up the chord, root first. */
  notes: string[];
  /** Roman numeral relative to the song's key, or null if the key is unset or the chord isn't diatonic. */
  romanNumeral: string | null;
  /** One line combining the roman numeral (if any) and quality, e.g. "V7 — Dominant 7th". */
  functionLabel: string;
  /** One line describing how this chord moves into/out of its neighbors. */
  progressionNote: string;
}

function pitchClassName(pitchClass: number): string {
  return PITCH_CLASS_NAMES[((pitchClass % 12) + 12) % 12];
}

/** Semitone distance from `from` up to `to`, in [0, 12). */
function distanceUp(from: number, to: number): number {
  return ((to - from) % 12 + 12) % 12;
}

function describeMotion(distance: number): string {
  switch (distance) {
    case 0:
      return "stays on the same root — sustains the harmony";
    case 5:
      return "moves up a 4th (down a 5th) — classic dominant-to-tonic resolution";
    case 7:
      return "moves up a 5th (down a 4th)";
    case 1:
      return "steps up a half step";
    case 11:
      return "steps down a half step";
    case 2:
      return "steps up a whole step";
    case 10:
      return "steps down a whole step";
    case 3:
    case 9:
      return "moves by a minor 3rd";
    case 4:
    case 8:
      return "moves by a major 3rd";
    default:
      return "moves by a tritone — strong, unstable motion";
  }
}

function shortLabel(symbol: string | undefined): string | null {
  if (!symbol) return null;
  const root = parseChordRoot(symbol);
  return root ? `${pitchClassName(root.rootPitchClass)}${root.quality}` : symbol;
}

/**
 * Explains one chord: its notes/quality, its roman-numeral function relative
 * to `key` (if set), and how its root moves into/out of its neighbors.
 * `prevSymbol`/`nextSymbol` are the chords immediately before/after this one
 * in playback order, if any.
 */
export function explainChord(
  symbol: string,
  { key, prevSymbol, nextSymbol }: { key?: string | null; prevSymbol?: string; nextSymbol?: string },
): ChordExplanation {
  const root = parseChordRoot(symbol);
  const rootName = root ? pitchClassName(root.rootPitchClass) : symbol;
  const quality = describeChordQuality(root?.quality ?? "");
  const notes = quality.intervals.map((i) => pitchClassName((root?.rootPitchClass ?? 0) + i));

  let romanNumeral: string | null = null;
  const keyRoot = key ? parseChordRoot(key) : null;
  if (root && keyRoot) {
    const degree = distanceUp(keyRoot.rootPitchClass, root.rootPitchClass);
    romanNumeral = MAJOR_SCALE_DEGREES[degree] ?? null;
  }

  const functionLabel = romanNumeral
    ? `${romanNumeral} — ${quality.label}`
    : keyRoot
      ? `Chromatic / borrowed — not diatonic to ${key}`
      : `${quality.label} chord`;

  let progressionNote: string;
  if (nextSymbol && root) {
    const nextRoot = parseChordRoot(nextSymbol);
    const nextLabel = shortLabel(nextSymbol);
    progressionNote = nextRoot
      ? `Leads into ${nextLabel}: root ${describeMotion(distanceUp(root.rootPitchClass, nextRoot.rootPitchClass))}.`
      : `Leads into ${nextLabel}.`;
  } else if (prevSymbol && root) {
    const prevRoot = parseChordRoot(prevSymbol);
    const prevLabel = shortLabel(prevSymbol);
    progressionNote = prevRoot
      ? `Arrives here from ${prevLabel}: root ${describeMotion(distanceUp(prevRoot.rootPitchClass, root.rootPitchClass))}.`
      : `Arrives here from ${prevLabel}.`;
  } else {
    progressionNote = "Standalone chord — no surrounding context yet.";
  }

  return {
    symbol,
    root: rootName,
    qualityLabel: quality.label,
    notes,
    romanNumeral,
    functionLabel,
    progressionNote,
  };
}
