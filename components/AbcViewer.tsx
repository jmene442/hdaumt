"use client";

// Renders an ABC notation string as sheet music using abcjs, and wires up
// hover explanations on the rendered chord symbols. abcjs draws directly
// into a DOM node itself rather than returning React elements — useEffect
// re-runs renderAbc() into `ref` whenever `abc` changes, then attaches
// native mouseenter/mouseleave listeners to the chord-symbol annotations it
// just drew, zipped by index against `chordRefs` (chartToAbc emits one
// annotation per chordRefs entry, in the same order).
import { useEffect, useRef } from "react";
import { renderAbc } from "abcjs";
import { explainChord } from "@/lib/chord-theory";
import { useChordTooltip } from "./ChordTooltip";
import type { ChordRef } from "@/lib/chart-to-abc";

export default function AbcViewer({
  abc,
  chordRefs,
  songKey,
}: {
  abc: string;
  chordRefs: ChordRef[];
  songKey: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { show, hide } = useChordTooltip();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // add_classes is required for abcjs to tag each rendered element with a
    // class (e.g. "abcjs-chord" on chord-symbol text) — without it none of
    // the SVG output has classes at all, and the hover listeners below have
    // nothing to attach to.
    renderAbc(container, abc, { responsive: "resize", add_classes: true });

    // Plain (unprefixed) chord-symbol annotations get the "abcjs-chord"
    // class; "abcjs-annotation" is a defensive fallback for other abcjs
    // versions. Either way they're drawn in source order, matching chordRefs.
    let elements = Array.from(container.querySelectorAll<SVGGraphicsElement>(".abcjs-chord"));
    if (elements.length === 0) {
      elements = Array.from(container.querySelectorAll<SVGGraphicsElement>(".abcjs-annotation"));
    }

    const cleanups: Array<() => void> = [];
    elements.forEach((el, i) => {
      const ref = chordRefs[i];
      if (!ref) return;
      el.style.cursor = "help";
      const onEnter = () => {
        const explanation = explainChord(ref.symbol, {
          key: songKey,
          prevSymbol: chordRefs[i - 1]?.symbol,
          nextSymbol: chordRefs[i + 1]?.symbol,
        });
        show(explanation, el.getBoundingClientRect());
      };
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", hide);
      cleanups.push(() => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", hide);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [abc, chordRefs, songKey, show, hide]);

  return (
    <div
      ref={containerRef}
      // Sheet music always reads as paper, independent of the light/dark
      // toggle — see app/globals.css's --parchment* tokens.
      className="overflow-x-auto rounded-lg border border-parchment-border bg-parchment p-4 text-parchment-ink shadow-sm"
    />
  );
}
