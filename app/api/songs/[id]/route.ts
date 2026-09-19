// Single-song endpoint backing the editor page: fetch one song, save edits
// (chart changes from the editor UI), or delete it. Ownership is checked on
// every operation so one user can never read or modify another's song.
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getSongsCollection } from "@/lib/mongodb";
import { serializeSong } from "@/lib/serialize-song";
import type { SongInput } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

/** Loads one song by id, scoped to the current user, or null if missing/not owned. */
async function findOwnedSong(userId: string, id: string) {
  if (!ObjectId.isValid(id)) return null;
  const songs = await getSongsCollection();
  return songs.findOne({ _id: new ObjectId(id), userId });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const doc = await findOwnedSong(session.user.id, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeSong(doc));
}

/** Replaces a song's editable fields (title/key/time signature/chart) with what the editor sent. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as Partial<SongInput>;
  const songs = await getSongsCollection();
  const result = await songs.findOneAndUpdate(
    { _id: new ObjectId(id), userId: session.user.id },
    {
      $set: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.key !== undefined ? { key: body.key } : {}),
        ...(body.defaultTimeSignature !== undefined ? { defaultTimeSignature: body.defaultTimeSignature } : {}),
        ...(body.sections !== undefined ? { sections: body.sections } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeSong(result));
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const songs = await getSongsCollection();
  const result = await songs.deleteOne({ _id: new ObjectId(id), userId: session.user.id });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
