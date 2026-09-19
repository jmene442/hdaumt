"use client";

// The main chart-editing UI: song metadata, a nested sections -> bars ->
// chords editor, the live ABC preview, and the AI suggestion panel. Holds
// its own copy of the song in state and PATCHes the whole thing to the API
// on "Save" rather than autosaving every keystroke.
import { useMemo, useState } from "react";
import type { Bar, Chord, Section, Song } from "@/lib/types";
import { chartToAbc } from "@/lib/chart-to-abc";
import AbcViewer from "./AbcViewer";
import SuggestPanel from "./SuggestPanel";

function newChord(): Chord {
  return { id: crypto.randomUUID(), symbol: "C", beat: 1 };
}

function newBar(order: number): Bar {
  return { id: crypto.randomUUID(), order, timeSignature: null, chords: [] };
}

function newSection(order: number): Section {
  return { id: crypto.randomUUID(), name: `Section ${order + 1}`, order, bars: [] };
}

export default function SongEditor({ initialSong }: { initialSong: Song }) {
  const [song, setSong] = useState(initialSong);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const abc = useMemo(() => chartToAbc(song), [song]);

  /** Persists the current title/key/time signature/chart to the API. */
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/songs/${song._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: song.title,
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
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
            placeholder="Untitled"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Key
          <input
            value={song.key ?? ""}
            onChange={(e) => setSong((s) => ({ ...s, key: e.target.value }))}
            className="w-20 rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
            placeholder="C"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time signature
          <input
            value={song.defaultTimeSignature}
            onChange={(e) => setSong((s) => ({ ...s, defaultTimeSignature: e.target.value }))}
            className="w-20 rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
            placeholder="4/4"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>

      <AbcViewer abc={abc} />

      <div className="flex flex-col gap-4">
        {song.sections.map((section) => (
          <div key={section.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={section.name}
                onChange={(e) => updateSection(section.id, { name: e.target.value })}
                className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm font-medium dark:border-zinc-700"
              />
              <button onClick={() => addBar(section.id)} className="text-sm text-zinc-600 underline dark:text-zinc-400">
                + Bar
              </button>
              <button onClick={() => removeSection(section.id)} className="ml-auto text-sm text-red-600 underline">
                Remove section
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {section.bars.map((bar, barIndex) => (
                <div key={bar.id} className="flex min-w-40 flex-col gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Bar {barIndex + 1}</span>
                    <button onClick={() => removeBar(section.id, bar.id)} className="text-red-600 underline">
                      remove
                    </button>
                  </div>
                  {bar.chords.map((chord) => (
                    <div key={chord.id} className="flex items-center gap-1">
                      <input
                        value={chord.symbol}
                        onChange={(e) => updateChord(section.id, bar.id, chord.id, { symbol: e.target.value })}
                        className="w-16 rounded border border-zinc-300 bg-transparent px-1 py-0.5 text-sm dark:border-zinc-700"
                        placeholder="Cmaj7"
                      />
                      <span className="text-xs text-zinc-500">beat</span>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={chord.beat}
                        onChange={(e) =>
                          updateChord(section.id, bar.id, chord.id, { beat: Number(e.target.value) })
                        }
                        className="w-14 rounded border border-zinc-300 bg-transparent px-1 py-0.5 text-sm dark:border-zinc-700"
                      />
                      <button
                        onClick={() => removeChord(section.id, bar.id, chord.id)}
                        className="text-xs text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addChord(section.id, bar.id)}
                    className="text-xs text-zinc-600 underline dark:text-zinc-400"
                  >
                    + chord
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={addSection} className="self-start text-sm text-zinc-600 underline dark:text-zinc-400">
          + Section
        </button>
      </div>

      <SuggestPanel songId={song._id} onSuggested={setSong} />
    </div>
  );
}
