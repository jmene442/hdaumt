"use client";

// The main chart-editing UI: song metadata, a description blurb, a nested
// sections -> bars -> chords editor, the live ABC preview (with hover
// explanations on both the chord list below and the rendered chord symbols
// above), and the AI suggestion panel. Holds its own copy of the song in
// state and PATCHes the whole thing to the API on "Save" rather than
// autosaving every keystroke.
import { useMemo, useState } from "react";
import type { Bar, Chord, Section, Song } from "@/lib/types";
import { chartToAbc } from "@/lib/chart-to-abc";
import { explainChord } from "@/lib/chord-theory";
import AbcViewer from "./AbcViewer";
import SuggestPanel from "./SuggestPanel";
import ThemeToggle from "./ThemeToggle";
import Button from "./ui/Button";
import { useChordTooltip } from "./ChordTooltip";

function newChord(): Chord {
  return { id: crypto.randomUUID(), symbol: "C", beat: 1 };
}

function newBar(order: number): Bar {
  return { id: crypto.randomUUID(), order, timeSignature: null, chords: [] };
}

function newSection(order: number): Section {
  return { id: crypto.randomUUID(), name: `Section ${order + 1}`, order, bars: [] };
}

function totalBars(song: Pick<Song, "sections">) {
  return song.sections.reduce((sum, section) => sum + section.bars.length, 0);
}

export default function SongEditor({ initialSong }: { initialSong: Song }) {
  const [song, setSong] = useState(initialSong);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { show, hide } = useChordTooltip();

  const { abc, chordRefs } = useMemo(() => chartToAbc(song), [song]);

  /** Index into chordRefs for each chord id, so the editor-list popover can look up its neighbors. */
  const chordIndexById = useMemo(() => {
    const map = new Map<string, number>();
    chordRefs.forEach((ref, i) => map.set(ref.chordId, i));
    return map;
  }, [chordRefs]);

  function handleChordHover(e: React.MouseEvent<HTMLElement>, chord: Chord) {
    const index = chordIndexById.get(chord.id);
    const explanation = explainChord(chord.symbol, {
      key: song.key,
      prevSymbol: index !== undefined ? chordRefs[index - 1]?.symbol : undefined,
      nextSymbol: index !== undefined ? chordRefs[index + 1]?.symbol : undefined,
    });
    show(explanation, e.currentTarget.getBoundingClientRect());
  }

  /** Persists the current title/description/key/time signature/chart to the API. */
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/songs/${song._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: song.title,
          description: song.description,
          key: song.key,
          defaultTimeSignature: song.defaultTimeSignature,
          sections: song.sections,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated: Song = await res.json();
      setSong(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateSection(sectionId: string, patch: Partial<Section>) {
    setSong((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === sectionId ? { ...sec, ...patch } : sec)),
    }));
  }

  function addSection() {
    setSong((s) => ({ ...s, sections: [...s.sections, newSection(s.sections.length)] }));
  }

  function removeSection(sectionId: string) {
    setSong((s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== sectionId) }));
  }

  function addBar(sectionId: string) {
    setSong((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, bars: [...sec.bars, newBar(sec.bars.length)] } : sec,
      ),
    }));
  }

  function removeBar(sectionId: string, barId: string) {
    setSong((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, bars: sec.bars.filter((b) => b.id !== barId) } : sec,
      ),
    }));
  }

  function updateBar(sectionId: string, barId: string, patch: Partial<Bar>) {
    setSong((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, bars: sec.bars.map((b) => (b.id === barId ? { ...b, ...patch } : b)) }
          : sec,
      ),
    }));
  }

  function addChord(sectionId: string, barId: string) {
    const bar = song.sections.find((s) => s.id === sectionId)?.bars.find((b) => b.id === barId);
    if (!bar) return;
    updateBar(sectionId, barId, { chords: [...bar.chords, newChord()] });
  }

  function updateChord(sectionId: string, barId: string, chordId: string, patch: Partial<Chord>) {
    const bar = song.sections.find((s) => s.id === sectionId)?.bars.find((b) => b.id === barId);
    if (!bar) return;
    updateBar(sectionId, barId, {
      chords: bar.chords.map((c) => (c.id === chordId ? { ...c, ...patch } : c)),
    });
  }

  function removeChord(sectionId: string, barId: string, chordId: string) {
    const bar = song.sections.find((s) => s.id === sectionId)?.bars.find((b) => b.id === barId);
    if (!bar) return;
    updateBar(sectionId, barId, { chords: bar.chords.filter((c) => c.id !== chordId) });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            value={song.title ?? ""}
            onChange={(e) => setSong((s) => ({ ...s, title: e.target.value }))}
            className="rounded border border-accent-soft bg-transparent px-2 py-1"
            placeholder="Untitled"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Key
          <input
            value={song.key ?? ""}
            onChange={(e) => setSong((s) => ({ ...s, key: e.target.value }))}
            className="w-20 rounded border border-accent-soft bg-transparent px-2 py-1"
            placeholder="C"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time signature
          <input
            value={song.defaultTimeSignature}
            onChange={(e) => setSong((s) => ({ ...s, defaultTimeSignature: e.target.value }))}
            className="w-20 rounded border border-accent-soft bg-transparent px-2 py-1"
            placeholder="4/4"
          />
        </label>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <ThemeToggle />
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          value={song.description ?? ""}
          onChange={(e) => setSong((s) => ({ ...s, description: e.target.value }))}
          placeholder="What this song is going for — tempo, feel, setup…"
          className="min-h-16 rounded border border-accent-soft bg-transparent p-2 text-sm"
        />
      </label>
      <p className="text-xs text-foreground/60">
        Key: {song.key || "unset"} · {song.defaultTimeSignature} · {song.sections.length} section
        {song.sections.length === 1 ? "" : "s"} · {totalBars(song)} bar{totalBars(song) === 1 ? "" : "s"}
      </p>

      <AbcViewer abc={abc} chordRefs={chordRefs} songKey={song.key} />

      <div className="flex flex-col gap-4">
        {song.sections.map((section) => (
          <div key={section.id} className="rounded-lg border border-accent-soft bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={section.name}
                onChange={(e) => updateSection(section.id, { name: e.target.value })}
                className="rounded border border-accent-soft bg-transparent px-2 py-1 text-sm font-medium"
              />
              <Button variant="ghost-link" onClick={() => addBar(section.id)}>
                + Bar
              </Button>
              <Button variant="danger-link" className="ml-auto" onClick={() => removeSection(section.id)}>
                Remove section
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              {section.bars.map((bar, barIndex) => (
                <div key={bar.id} className="flex min-w-40 flex-col gap-2 rounded border border-accent-soft p-2">
                  <div className="flex items-center justify-between text-xs text-foreground/60">
                    <span>Bar {barIndex + 1}</span>
                    <Button variant="danger-link" className="text-xs" onClick={() => removeBar(section.id, bar.id)}>
                      remove
                    </Button>
                  </div>
                  {bar.chords.map((chord) => (
                    <div
                      key={chord.id}
                      className="flex items-center gap-1"
                      onMouseEnter={(e) => handleChordHover(e, chord)}
                      onMouseLeave={hide}
                    >
                      <input
                        value={chord.symbol}
                        onChange={(e) => updateChord(section.id, bar.id, chord.id, { symbol: e.target.value })}
                        className="w-16 cursor-help rounded border border-accent-soft bg-transparent px-1 py-0.5 text-sm"
                        placeholder="Cmaj7"
                      />
                      <span className="text-xs text-foreground/60">beat</span>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={chord.beat}
                        onChange={(e) =>
                          updateChord(section.id, bar.id, chord.id, { beat: Number(e.target.value) })
                        }
                        className="w-14 rounded border border-accent-soft bg-transparent px-1 py-0.5 text-sm"
                      />
                      <Button
                        variant="danger-link"
                        className="text-xs"
                        onClick={() => removeChord(section.id, bar.id, chord.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost-link" className="text-xs" onClick={() => addChord(section.id, bar.id)}>
                    + chord
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button variant="ghost-link" className="self-start" onClick={addSection}>
          + Section
        </Button>
      </div>

      <SuggestPanel songId={song._id} onSuggested={setSong} />
    </div>
  );
}
