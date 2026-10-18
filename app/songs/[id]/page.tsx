// Song editor page: loads one song (scoped to the signed-in user) and hands
// it to the client-side SongEditor for interactive editing. proxy.ts already
// blocks signed-out visitors before this ever renders.
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getSongsCollection } from "@/lib/mongodb";
import { serializeSong } from "@/lib/serialize-song";
import SongEditor from "@/components/SongEditor";
import DatadogBrowserLogs from "@/components/DatadogBrowserLogs";

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !ObjectId.isValid(id)) notFound();

  const songs = await getSongsCollection();
  const doc = await songs.findOne({ _id: new ObjectId(id), userId: session.user.id });
  if (!doc) notFound();

  return (
    <>
      <SongEditor initialSong={serializeSong(doc)} />
      <DatadogBrowserLogs user={{ id: session.user.id, email: session.user.email }} />
    </>
  );
}
