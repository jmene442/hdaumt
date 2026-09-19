"use client";

// Lets the user type a freeform request ("8-bar chorus in G major") and
// sends it to the AI suggestion endpoint. On success it hands the whole
// updated song back to SongEditor via onSuggested, which replaces local state.
import { useState } from "react";
import type { Song } from "@/lib/types";

export default function SuggestPanel({
  songId,
  onSuggested,
}: {
  songId: string;
  onSuggested: (song: Song) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Posts the prompt to /api/songs/[id]/suggest and applies the returned song on success. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${songId}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Suggestion failed");
      }
      const song: Song = await res.json();
      onSuggested(song);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <label htmlFor="suggest-prompt" className="text-sm font-medium">
        Ask the AI for a section
      </label>
      <textarea
        id="suggest-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. an 8-bar chorus in G major with a lift at the end"
        className="min-h-20 rounded border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700"
      />
      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="self-start rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Thinking…" : "Suggest"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
