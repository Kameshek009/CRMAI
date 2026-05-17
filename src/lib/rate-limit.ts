import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitOptions {
  /** Max requests per window (default: 60) */
  limit?: number;
  /** Time window in ms (default: 60000 = 1 minute) */
  windowMs?: number;
  /** Key prefix — if set, uses `prefix:ip` instead of `ip:path` */
  keyPrefix?: string;
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

let redis: Redis | null = null;
if (useUpstash) {
  redis = new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! });
}

// Cache Ratelimit instances per (limit, windowMs) combination to reuse connections.
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number, prefix: string): Ratelimit {
  const cacheKey = `${prefix}:${limit}:${windowMs}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: `rl:${prefix}`,
      analytics: false,
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

// ---- In-memory fallback (dev/CI only) ---------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupMemory(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of memoryStore) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) memoryStore.delete(key);
  }
}

function checkMemory(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetMs: number } {
  cleanupMemory(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0]!;
    return { allowed: false, remaining: 0, resetMs: oldest + windowMs - now };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length, resetMs: windowMs };
}

// ---- Public API -------------------------------------------------------------

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check rate limit for the request. Returns NextResponse (429) if exceeded, null if ok.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 * otherwise falls back to a per-process in-memory store (suitable for dev/CI only —
 * on serverless platforms like Vercel, in-memory limits do not share state across
 * lambda instances and can be bypassed trivially).
 */
export async function checkRateLimit(
  request: NextRequest,
  options?: RateLimitOptions,
): Promise<NextResponse | null> {
  const limit = options?.limit ?? 60;
  const windowMs = options?.windowMs ?? 60_000;
  const prefix = options?.keyPrefix ?? "path";

  const ip = getClientIp(request);
  const identifier = options?.keyPrefix
    ? ip
    : `${ip}:${new URL(request.url).pathname}`;

  let allowed: boolean;
  let remaining: number;
  let resetMs: number;

  if (useUpstash && redis) {
    const limiter = getUpstashLimiter(limit, windowMs, prefix);
    const result = await limiter.limit(identifier);
    allowed = result.success;
    remaining = result.remaining;
    resetMs = Math.max(0, result.reset - Date.now());
  } else {
    const memKey = `${prefix}:${identifier}`;
    const result = checkMemory(memKey, limit, windowMs);
    allowed = result.allowed;
    remaining = result.remaining;
    resetMs = result.resetMs;
  }

  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(resetMs / 1000))),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null;
}

/** @internal — exposed for tests to reset state between cases. */
export function __resetRateLimitForTests() {
  memoryStore.clear();
  limiterCache.clear();
  lastCleanup = Date.now();
}
