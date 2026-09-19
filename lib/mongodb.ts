// Single shared MongoClient for the whole app. Next.js reloads modules on
// every hot-reload in dev, which would otherwise open a new DB connection
// per edit; stashing the client promise on `global` survives those reloads.
import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Builds the connection promise. Missing MONGODB_URI becomes a rejected
 * promise (not a thrown error) so importing this module never crashes
 * Next.js's build-time route collection — the error only surfaces when
 * something actually awaits a DB call.
 */
function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  const promise = uri
    ? new MongoClient(uri).connect()
    : Promise.reject(new Error("MONGODB_URI is not set — add it to .env.local"));
  promise.catch(() => {}); // avoids a Node "unhandled rejection" warning if this copy is never awaited
  return promise;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

export default clientPromise;

/** Fetches the app's database and returns the `songs` collection. Called by every songs API route. */
export async function getSongsCollection() {
  const client = await clientPromise;
  return client.db().collection("songs");
}
