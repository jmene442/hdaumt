// MongoDB documents use ObjectId/Date, but API responses and client code
// use the plain-string Song shape from lib/types.ts. This is the one
// conversion point between the two, called by every songs API route.
import type { Document, WithId } from "mongodb";
import type { Song } from "./types";

export function serializeSong(doc: WithId<Document>): Song {
  return {
    _id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title ?? null,
    key: doc.key ?? null,
    defaultTimeSignature: doc.defaultTimeSignature ?? "4/4",
    sections: doc.sections ?? [],
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}
