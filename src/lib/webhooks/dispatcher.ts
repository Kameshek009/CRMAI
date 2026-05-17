/**
 * Pure helpers for the webhook dispatcher cron worker.
 * Kept separate from the route so they can be unit-tested without Supabase or fetch.
 */

/**
 * Returns true if a subscription `pattern` should fire for `eventType`.
 *
 *   "*"             matches anything
 *   "contact.*"     matches "contact.created", "contact.updated", ...
 *   "contact.created"  exact match
 */
export function matchesEventType(pattern: string, eventType: string): boolean {
  if (pattern === "*") return true;
  if (pattern === eventType) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return eventType === prefix || eventType.startsWith(`${prefix}.`);
  }
  return false;
}

export function anyPatternMatches(patterns: readonly string[] | null | undefined, eventType: string): boolean {
  if (!patterns || patterns.length === 0) return false;
  for (const p of patterns) if (matchesEventType(p, eventType)) return true;
  return false;
}

/**
 * Exponential backoff for outbox retries. attempts is the count BEFORE this retry
 * (so first failure → attempts=0 → 30s, second → 2m, ...).
 *
 *   0 → 30s, 1 → 2m, 2 → 8m, 3 → 30m, 4 → 2h, 5+ → 6h
 */
const BACKOFF_LADDER_SECONDS: readonly number[] = [30, 120, 480, 1800, 7200, 21600];
const MIN_BACKOFF = BACKOFF_LADDER_SECONDS[0] as number;
const MAX_BACKOFF = BACKOFF_LADDER_SECONDS[BACKOFF_LADDER_SECONDS.length - 1] as number;
export const MAX_DELIVERY_ATTEMPTS = 6;

export function nextAttemptDelaySeconds(attempts: number): number {
  if (attempts < 0) return MIN_BACKOFF;
  if (attempts >= BACKOFF_LADDER_SECONDS.length) return MAX_BACKOFF;
  return BACKOFF_LADDER_SECONDS[attempts] as number;
}

export function nextAttemptAt(attempts: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + nextAttemptDelaySeconds(attempts) * 1000);
}

export function shouldGiveUp(attempts: number): boolean {
  return attempts >= MAX_DELIVERY_ATTEMPTS;
}
