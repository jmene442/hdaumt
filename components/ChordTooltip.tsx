"use client";

// Single floating tooltip shared by the chord-list editor (SongEditor) and
// the rendered sheet music (AbcViewer), so a chord's hover explanation
// looks and reads identically on both surfaces. Rendered once at the app
// root via ChordTooltipProvider; callers reach it through useChordTooltip().
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ChordExplanation } from "@/lib/chord-theory";

interface TooltipState {
  explanation: ChordExplanation;
  top: number;
  left: number;
}

interface ChordTooltipContextValue {
  show: (explanation: ChordExplanation, anchor: DOMRect) => void;
  hide: () => void;
}

const ChordTooltipContext = createContext<ChordTooltipContextValue | null>(null);

export function useChordTooltip(): ChordTooltipContextValue {
  const ctx = useContext(ChordTooltipContext);
  if (!ctx) throw new Error("useChordTooltip must be used within a ChordTooltipProvider");
  return ctx;
}

export function ChordTooltipProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TooltipState | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((explanation: ChordExplanation, anchor: DOMRect) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setState({
      explanation,
      top: anchor.top - 8,
      left: anchor.left + anchor.width / 2,
    });
  }, []);

  const hide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setState(null), 60);
  }, []);

  // Memoized so the context value stays referentially stable while only
  // `state` (the tooltip's own visibility/content) changes on hover — the
  // show/hide callers (AbcViewer, SongEditor) only need to re-run their
  // effects when show/hide themselves change, never on every hover.
  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ChordTooltipContext.Provider value={value}>
      {children}
      {state && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-accent-soft bg-card p-3 text-sm text-foreground shadow-lg"
          style={{ top: state.top, left: state.left }}
        >
          <p className="font-semibold">
            {state.explanation.symbol}
            {state.explanation.romanNumeral && (
              <span className="ml-1 font-normal text-accent">({state.explanation.romanNumeral})</span>
            )}
          </p>
          <p className="mt-1 text-xs text-foreground/70">{state.explanation.functionLabel}</p>
          <p className="mt-2 text-xs">
            <span className="font-medium">Notes:</span> {state.explanation.notes.join(", ")}
          </p>
          <p className="mt-1 text-xs text-foreground/70">{state.explanation.progressionNote}</p>
        </div>
      )}
    </ChordTooltipContext.Provider>
  );
}
