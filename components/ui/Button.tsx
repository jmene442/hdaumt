// Shared button so every button in the app gets the same click/press
// feedback (active:scale + active:brightness) instead of each component
// re-declaring its own inline className with no pressed state.
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "ghost-link" | "danger-link";

const BASE = "transition active:scale-[0.97] active:brightness-95 disabled:opacity-50 disabled:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  primary: `${BASE} rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground`,
  dark: `${BASE} rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900`,
  "ghost-link": `${BASE} text-sm text-foreground/70 underline underline-offset-2`,
  "danger-link": `${BASE} text-sm text-red-600 underline underline-offset-2`,
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${VARIANTS[variant]} ${className}`} {...props} />;
}
