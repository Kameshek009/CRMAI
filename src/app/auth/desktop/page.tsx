import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { generateAuthCode } from "@/lib/desktop-auth";
import DesktopAuthClient from "./client";

/**
 * /auth/desktop
 *
 * Desktop app authorization page.
 * This page is opened in the browser when the desktop app initiates login.
 *
 * Flow:
 * 1. Desktop opens: dashboard.serotonin.to/auth/desktop?state=xxx&device_name=xxx
 * 2. If not signed in, redirect to Clerk sign-in with return URL
 * 3. If signed in, show authorization confirmation
 * 4. On confirm, generate auth code and redirect to serotonin://callback?code=xxx&state=xxx
 */
export default async function DesktopAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; device_name?: string; device_id?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const { state, device_name, device_id, platform } = params;

  // Validate required parameters
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Invalid Request</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Missing required state parameter. Please try again from the desktop app.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const { userId } = await auth();

  if (!userId) {
    // Not signed in - redirect to sign-in with return URL
    const returnUrl = `/auth/desktop?state=${encodeURIComponent(state)}${device_name ? `&device_name=${encodeURIComponent(device_name)}` : ""}${device_id ? `&device_id=${encodeURIComponent(device_id)}` : ""}${platform ? `&platform=${encodeURIComponent(platform)}` : ""}`;

    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`);
  }

  // Get user info
  const user = await currentUser();

  // Render client component for authorization confirmation
  return (
    <DesktopAuthClient
      state={state}
      deviceName={device_name}
      deviceId={device_id}
      platform={platform}
      userId={userId}
      userEmail={user?.emailAddresses[0]?.emailAddress ?? undefined}
      userName={user?.firstName ?? user?.username ?? undefined}
      userImage={user?.imageUrl ?? undefined}
    />
  );
}
