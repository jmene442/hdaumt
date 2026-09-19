// Converts a song's chart data (sections -> bars -> chords) into an ABC
// notation string that abcjs can render. This is the one place the app
// decides what a chord "looks like" on the staff: each chord is voiced and
// held for its full duration, tied across bar lines when it continues, per
// CLAUDE.md's chart-layer-only v1 scope. Only components/AbcViewer.tsx and
// the song editor call this.
import { parseChordSymbol, semitoneToAbcPitch } from "./chords";
import type { Song } from "./types";

/**
 * v1 resolution: chord beat positions/durations are assumed to land on
 * eighth-note boundaries (0.5-beat increments). L:1/8 in the ABC header
 * makes 1 eighth-note = 1 length unit, so every duration below is a plain
 * integer with no fractions to format.
 */
const EIGHTHS_PER_BEAT = 2;

interface FlatBar {
  beatsPerBar: number;
  chords: { beat: number; symbol: string }[];
  sectionLabel?: string;
}

/** Reads the beat count out of a "4/4"-style time signature, defaulting to 4 on anything malformed. */
function timeSigBeats(ts: string): number {
  const numerator = Number(ts.split("/")[0]);
  return Number.isFinite(numerator) && numerator > 0 ? numerator : 4;
}

/**
 * Sorts sections/bars/chords into playback order and resolves each bar's
 * effective time signature (bar override, else song default). Tags the
 * first bar of each section with that section's name for the ABC label.
 */
function flattenBars(song: Pick<Song, "sections" | "defaultTimeSignature">): FlatBar[] {
  const flat: FlatBar[] = [];
  const sortedSections = [...song.sections].sort((a, b) => a.order - b.order);
  for (const section of sortedSections) {
    const sortedBars = [...section.bars].sort((a, b) => a.order - b.order);
    sortedBars.forEach((bar, index) => {
      flat.push({
        beatsPerBar: timeSigBeats(bar.timeSignature ?? song.defaultTimeSignature),
        chords: [...bar.chords]
          .sort((a, b) => a.beat - b.beat)
          .map((c) => ({ beat: c.beat, symbol: c.symbol })),
        sectionLabel: index === 0 ? section.name : undefined,
      });
    });
  }
  return flat;
}

interface Segment {
  startEighths: number;
  durationEighths: number;
  /** Chord tones as semitone offsets from middle C, or null for a rest (used before the first chord). */
  semitones: number[] | null;
}

/**
 * Builds the song's absolute-beat timeline: a chord holds from its own
 * position until the next chord event (possibly several bars later), which
 * is what lets renderBody() later tie a sustained chord across bar lines.
 * Calls parseChordSymbol() to turn each chord's text into actual pitches.
 */
function buildTimeline(flatBars: FlatBar[]): { segments: Segment[]; barBoundaries: number[] } {
  const barBoundaries: number[] = [0];
  let cursor = 0;
  for (const bar of flatBars) {
    cursor += bar.beatsPerBar * EIGHTHS_PER_BEAT;
    barBoundaries.push(cursor);
  }
  const total = cursor;

  const events: { absoluteEighths: number; semitones: number[] }[] = [];
  flatBars.forEach((bar, barIndex) => {
    const barStart = barBoundaries[barIndex];
    for (const chord of bar.chords) {
      const { semitones } = parseChordSymbol(chord.symbol);
      events.push({
        absoluteEighths: Math.round(barStart + (chord.beat - 1) * EIGHTHS_PER_BEAT),
        semitones,
      });
    }
  });
  events.sort((a, b) => a.absoluteEighths - b.absoluteEighths);
  // If two chords land on the same position, the later one in chart order wins.
  const deduped = events.filter(
    (e, i) => i === events.length - 1 || events[i + 1].absoluteEighths !== e.absoluteEighths,
  );

  const segments: Segment[] = [];
  if (deduped.length === 0) {
    segments.push({ startEighths: 0, durationEighths: total, semitones: null });
    return { segments, barBoundaries };
  }
  if (deduped[0].absoluteEighths > 0) {
    segments.push({ startEighths: 0, durationEighths: deduped[0].absoluteEighths, semitones: null });
  }
  deduped.forEach((event, i) => {
    const end = i + 1 < deduped.length ? deduped[i + 1].absoluteEighths : total;
    segments.push({
      startEighths: event.absoluteEighths,
      durationEighths: end - event.absoluteEighths,
      semitones: event.semitones,
    });
  });
  return { segments: segments.filter((s) => s.durationEighths > 0), barBoundaries };
}

/** Formats an ABC note-length suffix: omitted for 1 unit, otherwise the plain integer. */
function abcNoteLength(units: number): string {
  return units === 1 ? "" : String(units);
}

/** Renders one segment as an ABC token: a rest ("z4") or a bracketed chord ("[ceg]4"). */
function segmentToAbcToken(semitones: number[] | null, units: number): string {
  const length = abcNoteLength(units);
  if (semitones === null) return `z${length}`;
  if (semitones.length === 1) return `${semitoneToAbcPitch(semitones[0])}${length}`;
  return `[${semitones.map(semitoneToAbcPitch).join("")}]${length}`;
}

/**
 * Walks the timeline bar by bar, clipping each segment to what fits before
 * the next bar line and adding a tie ("-") whenever a chord's sustain
 * continues into the following bar. Produces one ABC line per bar.
 */
function renderBody(flatBars: FlatBar[], segments: Segment[], barBoundaries: number[]): string {
  const lines: string[] = [];
  let segIndex = 0;

  for (let barIndex = 0; barIndex < flatBars.length; barIndex++) {
    const bar = flatBars[barIndex];
    const barStart = barBoundaries[barIndex];
    const barEnd = barBoundaries[barIndex + 1];
    const barTokens: string[] = [];
    let pos = barStart;
    let firstTokenInBar = true;

    while (pos < barEnd && segIndex < segments.length) {
      const seg = segments[segIndex];
      const segEnd = seg.startEighths + seg.durationEighths;
      const chunkEnd = Math.min(segEnd, barEnd);
      const chunkUnits = chunkEnd - pos;
      const continuesPastBar = segEnd > barEnd;

      const label = firstTokenInBar && bar.sectionLabel ? `"^${bar.sectionLabel}"` : "";
      barTokens.push(label + segmentToAbcToken(seg.semitones, chunkUnits) + (continuesPastBar ? "-" : ""));
      firstTokenInBar = false;

      pos = chunkEnd;
      if (chunkEnd >= segEnd) segIndex++;
    }

    if (barTokens.length === 0) {
      // Defensive fallback — should only happen if the timeline math above has a gap.
      barTokens.push(`z${bar.beatsPerBar * EIGHTHS_PER_BEAT}`);
    }
    barTokens.push("|");
    lines.push(barTokens.join(" "));
  }
  return lines.join("\n");
}

/** Builds the full ABC tune (header + body) for a song. Called by AbcViewer whenever chart data changes. */
export function chartToAbc(song: Pick<Song, "title" | "key" | "defaultTimeSignature" | "sections">): string {
  const flatBars = flattenBars(song);
  const effectiveBars: FlatBar[] =
    flatBars.length > 0 ? flatBars : [{ beatsPerBar: timeSigBeats(song.defaultTimeSignature), chords: [] }];

  const { segments, barBoundaries } = buildTimeline(effectiveBars);
  const body = renderBody(effectiveBars, segments, barBoundaries);

  const header = [
    "X:1",
    `T:${song.title?.trim() || "Untitled"}`,
    `M:${song.defaultTimeSignature}`,
    "L:1/8",
    `K:${song.key?.trim() || "C"} clef=treble`,
  ].join("\n");

  return `${header}\n${body}\n`;
}
