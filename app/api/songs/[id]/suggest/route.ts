// AI suggestion endpoint: takes the user's freeform prompt, asks Claude
// (via lib/anthropic.ts) to propose new chart sections, appends them to the
// song in MongoDB, and returns the updated song so the editor can re-render.
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getSongsCollection } from "@/lib/mongodb";
import { serializeSong } from "@/lib/serialize-song";
import { suggestSections } from "@/lib/anthropic";
import type { Bar, Chord, Section } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { prompt } = (await request.json()) as { prompt?: string };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const songs = await getSongsCollection();
  const existing = await songs.findOne({ _id: new ObjectId(id), userId: session.user.id });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const proposed = await suggestSections(prompt, {
    key: existing.key ?? null,
    defaultTimeSignature: existing.defaultTimeSignature ?? "4/4",
    existingSections: existing.sections ?? [],
  });

  // The model returns bare shape (names/chords) — assign real ids and order
  // indices here so the proposed sections slot into the song like any other.
  const existingSections: Section[] = existing.sections ?? [];
  const newSections: Section[] = proposed.map((section, sectionIndex) => ({
    id: randomUUID(),
    name: section.name,
    order: existingSections.length + sectionIndex,
    bars: section.bars.map(
      (bar, barIndex): Bar => ({
        id: randomUUID(),
        order: barIndex,
        timeSignature: null,
        chords: bar.chords.map(
          (chord): Chord => ({
            id: randomUUID(),
            symbol: chord.symbol,
            beat: chord.beat,
          }),
        ),
      }),
    ),
  }));

  const result = await songs.findOneAndUpdate(
    { _id: new ObjectId(id), userId: session.user.id },
    { $set: { sections: [...existingSections, ...newSections], updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeSong(result));
}
