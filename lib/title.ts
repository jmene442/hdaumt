// Derives a default song title from the user's creation prompt, so new
// songs don't all sit in the dashboard as "Untitled". Called client-side by
// NewSongPrompt before the initial POST /api/songs.

const MAX_WORDS = 8;
const MAX_CHARS = 60;

/** Trims, caps at ~8 words / 60 chars, strips trailing punctuation, capitalizes. */
export function deriveTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled";

  const words = trimmed.split(" ");
  let truncated = words.length > MAX_WORDS;
  let title = words.slice(0, MAX_WORDS).join(" ");

  if (title.length > MAX_CHARS) {
    title = title.slice(0, MAX_CHARS).trimEnd();
    truncated = true;
  }

  title = title.replace(/[.,;:!?\s]+$/, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return truncated ? `${title}…` : title;
}
