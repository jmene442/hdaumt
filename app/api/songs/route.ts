// Collection-level songs endpoint: lists the signed-in user's songs (for
// the dashboard) and creates new ones (for the "New Song" button). proxy.ts
// already ensures only signed-in users reach this route.
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSongsCollection } from "@/lib/mongodb";
import { serializeSong } from "@/lib/serialize-song";

/** Returns every song owned by the current user, most recently updated first. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const songs = await getSongsCollection();
  const docs = await songs.find({ userId: session.user.id }).sort({ updatedAt: -1 }).toArray();
  return NextResponse.json(docs.map(serializeSong));
}

/** Creates a new, mostly-empty song owned by the current user and returns it. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const now = new Date();
  const doc = {
    userId: session.user.id,
    title: typeof body.title === "string" ? body.title : null,
    key: typeof body.key === "string" ? body.key : null,
    defaultTimeSignature: typeof body.defaultTimeSignature === "string" ? body.defaultTimeSignature : "4/4",
    sections: [
      {
        id: randomUUID(),
        name: "Verse 1",
        order: 0,
        bars: [],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const songs = await getSongsCollection();
  const result = await songs.insertOne(doc);
  return NextResponse.json(serializeSong({ ...doc, _id: result.insertedId }), { status: 201 });
}
