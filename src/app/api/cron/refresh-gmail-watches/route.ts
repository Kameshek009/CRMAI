import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ensureGmailWatchForConnection } from "@/lib/inbox/gmail";

/**
 * Gmail watch TTL is 7 days. We re-issue any watch whose expiration is
 * within the next 2 days. Daily cron leaves a comfortable buffer for one
 * missed run.
 *
 * Auth: Bearer CRON_SECRET (matches sequence-processor pattern).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.GOOGLE_PUBSUB_TOPIC) {
    return NextResponse.json({ ok: true, skipped: "no_pubsub_topic" });
  }

  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("oauth_tokens")
    .select("id, team_id, metadata")
    .eq("provider", "google");
  if (error) {
    logger.error("GmailWatchCron", "DB error fetching connections", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const horizon = Date.now() + 2 * 24 * 60 * 60 * 1000; // 2 days
  let refreshed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const meta = (row.metadata ?? {}) as { gmail_watch?: { expiration?: string } };
    const expirationStr = meta.gmail_watch?.expiration;
    const expirationMs = expirationStr ? Date.parse(expirationStr) : 0;
    const needsRefresh = !expirationStr || expirationMs < horizon;
    if (!needsRefresh) {
      skipped++;
      continue;
    }
    try {
      await ensureGmailWatchForConnection({ teamId: row.team_id });
      refreshed++;
    } catch (e) {
      failed++;
      logger.warn("GmailWatchCron", "Refresh failed", { team_id: row.team_id, error: e });
    }
  }

  return NextResponse.json({ ok: true, refreshed, skipped, failed });
}
