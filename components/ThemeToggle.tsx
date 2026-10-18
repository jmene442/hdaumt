"use client";

// Manual dark/light switch. The actual "no flash on load" logic lives in
// the inline script in app/layout.tsx; this component just keeps the
// <html class="dark"> toggle and localStorage in sync after that.
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // One-time sync from the DOM class the blocking init script (app/layout.tsx)
    // already set before hydration — not an "effect" in the data-flow sense,
    // just reading external truth once after mount to avoid an SSR/CSR mismatch
    // (server has no document, so the icon can't be computed during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full border border-accent-soft bg-card px-2.5 py-1.5 text-sm transition active:scale-[0.97] active:brightness-95"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
