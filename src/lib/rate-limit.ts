import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  /** Max requests per window (default: 60) */
  limit?: number;
  /** Time window in ms (default: 60000 = 1 minute) */
  windowMs?: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check rate limit for the request. Returns NextResponse (429) if exceeded, null if ok.
 */
export function checkRateLimit(
  request: NextRequest,
  options?: RateLimitOptions
): NextResponse | null {
  const limit = options?.limit ?? 60;
  const windowMs = options?.windowMs ?? 60_000;

  const ip = getClientIp(request);
  const path = new URL(request.url).pathname;
  const key = `${ip}:${path}`;

  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  if (entry.timestamps.length === 0) store.delete(key);

  if (entry.timestamps.length >= limit) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(windowMs / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  entry.timestamps.push(now);
  return null;
}
