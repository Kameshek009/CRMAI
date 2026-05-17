import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { syncGoogleCalendar } from "@/lib/calendar/google";
import type { OAuthConnectionRow } from "@/lib/oauth/tokens";

/**
 * Google Calendar push webhook. Push is HTTP POST with empty body; the
 * interesting bits are headers:
 *
 *   X-Goog-Channel-ID     — id we passed at watch time
 *   X-Goog-Channel-Token  — our secret, verifies the caller is Google
 *   X-Goog-Resource-State — 'sync' (first ack) | 'exists' (changes) | 'not_exists'
 *   X-Goog-Resource-ID    — opaque per-resource id
 *   X-Goog-Message-Number — monotonic counter
 *
 * Verification: we look up the channel ID in oauth_tokens.metadata.calendar
 * and compare the token. Mismatch → 401.
 */
export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const state = request.headers.get("x-goog-resource-state");

  if (!channelId || !channelToken) {
    return NextResponse.json({ error: "Missing channel headers" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data: rows } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("provider", "google")
    .filter("metadata->calendar->>channel_id", "eq", channelId);

  if (!rows || rows.length === 0) {
    logger.info("CalendarWebhook", "No connection for channel — acking", { channel_id: channelId });
    return NextResponse.json({ ok: true });
  }
  const connection = rows[0] as OAuthConnectionRow;
  const meta = (connection.metadata ?? {}) as { calendar?: { token?: string } };
  if (meta.calendar?.token !== channelToken) {
    logger.warn("CalendarWebhook", "Channel token mismatch", { channel_id: channelId });
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Google's first ping after watch is `sync` — nothing to fetch.
  if (state === "sync") {
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await syncGoogleCalendar({ connection });
    logger.info("CalendarWebhook", "Sync ran", {
      team_id: connection.team_id,
      upserted: result.upserted,
      deleted: result.deleted,
    });
  } catch (e) {
    logger.error("CalendarWebhook", "Sync failed", { team_id: connection.team_id, error: e });
    // Still return 200 so Google doesn't replay aggressively.
  }
  return NextResponse.json({ ok: true });
}
