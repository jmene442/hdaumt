"use client";

// Dashboard "New Song" button: creates an empty song via the API, then
// navigates straight to its editor page so the user starts writing immediately.
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewSongButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    setCreating(true);
    try {
      const res = await fetch("/api/songs", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const song = await res.json();
      router.push(`/songs/${song._id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={creating}
      className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
    >
      {creating ? "Creating…" : "New Song"}
    </button>
  );
}
