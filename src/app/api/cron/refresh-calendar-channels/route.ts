import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ensureCalendarChannel } from "@/lib/calendar/google";

/**
 * Calendar push channels live up to 7 days. We re-create any channel whose
 * expiration is within the next 2 days. Auth: Bearer CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("oauth_tokens")
    .select("id, team_id, metadata")
    .eq("provider", "google");
  if (error) {
    logger.error("CalendarChannelCron", "DB error", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const horizon = Date.now() + 2 * 24 * 60 * 60 * 1000;
  let refreshed = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const meta = (row.metadata ?? {}) as { calendar?: { expiration?: string } };
    const expStr = meta.calendar?.expiration;
    const expMs = expStr ? Date.parse(expStr) : 0;
    if (expMs >= horizon) {
      skipped++;
      continue;
    }
    try {
      await ensureCalendarChannel({ teamId: row.team_id });
      refreshed++;
    } catch (e) {
      failed++;
      logger.warn("CalendarChannelCron", "refresh failed", { team_id: row.team_id, error: e });
    }
  }
  return NextResponse.json({ ok: true, refreshed, skipped, failed });
}
