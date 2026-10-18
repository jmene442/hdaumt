// Root layout: wraps every route in the shared HTML shell, fonts, and
// global styles. No auth or data logic lives here — that's per-page.
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ChordTooltipProvider } from "@/components/ChordTooltip";
import DatadogBrowserLogs from "@/components/DatadogBrowserLogs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Music Composition Generator",
  description: "Write and organize your own songs, with AI help on chord structure.",
};

/**
 * Applies the saved/system theme before paint so there's no flash of the
 * wrong theme on load. Kept as a tiny inline script (not a useEffect) since
 * it has to run before React hydrates.
 */
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The inline theme script below adds/removes the "dark" class on this
      // element before React hydrates, which would otherwise read as a
      // server/client HTML mismatch — this is the standard opt-out for that
      // specific, intentional case (same approach next-themes uses).
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <DatadogBrowserLogs />
        <ChordTooltipProvider>{children}</ChordTooltipProvider>
      </body>
    </html>
  );
}
