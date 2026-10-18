// Single shared MongoClient for the whole app. Next.js reloads modules on
// every hot-reload in dev, which would otherwise open a new DB connection
// per edit; stashing the client promise on `global` survives those reloads.
import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Connects with a short per-attempt timeout and a couple of retries before
 * giving up. Atlas's free M0 tier occasionally takes the full default 30s
 * to answer a cold connection from Vercel; because `clientPromise` below is
 * a single promise reused across requests on the same warm Fluid Compute
 * instance, one timed-out attempt would otherwise permanently poison every
 * later request on that instance (a rejected promise never un-rejects).
 * Retrying here, before the promise settles, means a single slow/flaky
 * attempt doesn't take the whole warm instance down with it.
 */
async function connectWithRetry(uri: string, attemptsLeft = 3): Promise<MongoClient> {
  try {
    return await new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
  } catch (err) {
    if (attemptsLeft <= 1) throw err;
    return connectWithRetry(uri, attemptsLeft - 1);
  }
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
    ? connectWithRetry(uri)
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
