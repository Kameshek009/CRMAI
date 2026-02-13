"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DesktopAuthClientProps {
  state: string;
  deviceName?: string;
  deviceId?: string;
  platform?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userImage?: string;
}

export default function DesktopAuthClient({
  state,
  deviceName,
  deviceId,
  platform,
  userId,
  userEmail,
  userName,
  userImage,
}: DesktopAuthClientProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    setError(null);

    try {
      // Call server action to generate token
      const response = await fetch("/api/auth/desktop/authorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state,
          device_name: deviceName,
          device_id: deviceId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to authorize");
      }

      // Redirect to desktop app via deep link with tokens and account data
      // New format: access_token + refresh_token (for refresh flow)
      const callbackUrl = `serotonin://callback?access_token=${encodeURIComponent(data.access_token)}&refresh_token=${encodeURIComponent(data.refresh_token)}&expires_at=${encodeURIComponent(data.expires_at)}&state=${encodeURIComponent(state)}&account=${encodeURIComponent(JSON.stringify(data.account))}&user=${encodeURIComponent(JSON.stringify(data.user))}`;

      // Try to open the deep link
      window.location.href = callbackUrl;

      // Show success message after a delay (in case deep link doesn't work)
      setTimeout(() => {
        setIsAuthorizing(false);
      }, 3000);
    } catch (err) {
      console.error("Authorization error:", err);
      setError(err instanceof Error ? err.message : "Authorization failed");
      setIsAuthorizing(false);
    }
  };

  const handleCancel = () => {
    // Redirect to desktop app with error
    const callbackUrl = `serotonin://callback?error=access_denied&error_description=${encodeURIComponent("User cancelled authorization")}&state=${encodeURIComponent(state)}`;
    window.location.href = callbackUrl;
  };

  // Format platform name
  const platformDisplay = platform === "darwin" ? "macOS" : platform === "win32" ? "Windows" : platform || "Desktop";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Authorize Desktop App
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {userEmail}
            </p>
          </div>

          {/* Device */}
          <div className="text-center text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            {deviceName || "NexusCRM Desktop"} · {platformDisplay}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)] rounded px-3 py-2 mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isAuthorizing}
              className="flex-1 px-4 py-2 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAuthorize}
              disabled={isAuthorizing}
              className="flex-1 px-4 py-2 rounded bg-[#007AFF] text-white text-sm font-medium hover:bg-[#0066DD] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAuthorizing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authorizing</span>
                </>
              ) : (
                "Authorize"
              )}
            </button>
          </div>

          {/* Footer link */}
          <p className="mt-4 text-xs text-center text-neutral-400 dark:text-neutral-500">
            <a href="/sign-in" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
              Use a different account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
