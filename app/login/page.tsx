// Dedicated sign-in page. proxy.ts sends signed-out visitors here (with a
// callbackUrl back to whatever they were trying to reach) instead of
// handling the logged-out state inline on the dashboard.
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInButton from "@/components/SignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Music Composition Generator</h1>
      {error === "AccessDenied" && (
        <p className="max-w-sm text-center text-sm text-red-600">
          This app is invite-only and your Google account isn&apos;t on the access list.
        </p>
      )}
      <SignInButton callbackUrl={callbackUrl} />
    </main>
  );
}
