"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("AppError", "Unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <pre className="text-left text-xs text-red-600 bg-muted p-4 rounded overflow-auto max-w-lg">
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
