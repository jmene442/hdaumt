"use client";

// Dashboard "start a new song" entry point: takes a freeform prompt, creates
// a new song (title derived from the prompt, description set to the prompt
// itself), asks the AI to populate its first section(s) from the prompt,
// then navigates straight to the editor. Replaces the old empty "New Song"
// button — the AI suggestion step now happens up front instead of requiring
// a second trip through SuggestPanel on the editor page.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deriveTitleFromPrompt } from "@/lib/title";
import Button from "./ui/Button";

export default function NewSongPrompt() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const createRes = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: deriveTitleFromPrompt(prompt), description: prompt }),
      });
      if (!createRes.ok) throw new Error("Could not create song");
      const song = await createRes.json();

      const suggestRes = await fetch(`/api/songs/${song._id}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!suggestRes.ok) {
        const body = await suggestRes.json().catch(() => ({}));
        throw new Error(body.error ?? "AI suggestion failed");
      }

      router.push(`/songs/${song._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-accent-soft bg-card p-4">
      <label htmlFor="new-song-prompt" className="text-sm font-medium">
        Start a new song
      </label>
      <textarea
        id="new-song-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. a slow 12-bar blues in E with a turnaround"
        className="min-h-20 rounded border border-accent-soft bg-transparent p-2 text-sm"
      />
      <Button type="submit" disabled={loading || !prompt.trim()} className="self-start">
        {loading ? "Creating…" : "Create song"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
