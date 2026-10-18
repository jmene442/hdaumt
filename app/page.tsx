// Dashboard: the logged-in landing page. proxy.ts already redirects
// signed-out visitors to /login before this ever renders; the session check
// here is a defensive fallback (same belt-and-suspenders pattern as
// app/songs/[id]/page.tsx), not the primary guard. Reads the song list
// straight from MongoDB (server component) rather than round-tripping
// through the API route.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSongsCollection } from "@/lib/mongodb";
import { serializeSong } from "@/lib/serialize-song";
import NewSongPrompt from "@/components/NewSongPrompt";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";

/** Counts every bar across a song's sections, for the table's "bars" column. */
function totalBars(song: { sections: { bars: unknown[] }[] }) {
  return song.sections.reduce((sum, section) => sum + section.bars.length, 0);
}

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const songsCollection = await getSongsCollection();
  const docs = await songsCollection.find({ userId: session.user.id }).sort({ updatedAt: -1 }).toArray();
  const songs = docs.map(serializeSong);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your songs</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>

      <NewSongPrompt />

      {songs.length === 0 ? (
        <p className="text-sm text-foreground/70">No songs yet — describe one above to get started.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-accent-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-accent-soft bg-accent-soft/60 text-xs uppercase text-foreground/70">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Time signature</th>
                <th className="px-3 py-2 font-medium">Sections</th>
                <th className="px-3 py-2 font-medium">Bars</th>
                <th className="px-3 py-2 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song._id} className="border-b border-accent-soft/60 last:border-0 odd:bg-card even:bg-accent-soft/20 hover:bg-mint/30">
                  <td className="px-3 py-2">
                    <Link href={`/songs/${song._id}`} className="font-medium text-accent underline">
                      {song.title || "Untitled"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-foreground/70">{song.key || "—"}</td>
                  <td className="px-3 py-2 text-foreground/70">{song.defaultTimeSignature}</td>
                  <td className="px-3 py-2 text-foreground/70">{song.sections.length}</td>
                  <td className="px-3 py-2 text-foreground/70">{totalBars(song)}</td>
                  <td className="px-3 py-2 text-foreground/70">
                    {new Date(song.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
