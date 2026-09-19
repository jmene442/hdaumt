"use client";

// Renders an ABC notation string as sheet music using abcjs. This is a thin
// wrapper because abcjs draws directly into a DOM node itself rather than
// returning React elements — useEffect re-runs renderAbc() into `ref`
// whenever the `abc` string (recomputed by chartToAbc) changes.
import { useEffect, useRef } from "react";
import { renderAbc } from "abcjs";

export default function AbcViewer({ abc }: { abc: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      renderAbc(containerRef.current, abc, { responsive: "resize" });
    }
  }, [abc]);

  return <div ref={containerRef} className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" />;
}
