// Dashboard / home page: shows the signed-in user's songs, or a sign-in
// prompt if they're logged out. Reads the song list straight from MongoDB
// (server component) rather than round-tripping through the API route.
import Link from "next/link";
import { auth } from "@/auth";
import { getSongsCollection } from "@/lib/mongodb";
import { serializeSong } from "@/lib/serialize-song";
import NewSongButton from "@/components/NewSongButton";
import SignOutButton from "@/components/SignOutButton";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Music Composition Generator</h1>
        <SignInButton />
      </main>
    );
  }

  const songsCollection = await getSongsCollection();
  const docs = await songsCollection.find({ userId: session.user.id }).sort({ updatedAt: -1 }).toArray();
  const songs = docs.map(serializeSong);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your songs</h1>
        <div className="flex items-center gap-4">
          <NewSongButton />
          <SignOutButton />
        </div>
      </div>

      {songs.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No songs yet — create one to get started.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((song) => (
            <li key={song._id}>
              <Link
                href={`/songs/${song._id}`}
                className="block rounded border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {song.title || "Untitled"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
