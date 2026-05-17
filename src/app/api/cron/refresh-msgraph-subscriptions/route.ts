import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  ensureOutlookInboxSubscription,
  renewOutlookSubscription,
} from "@/lib/inbox/microsoft";
import { getValidAccessToken } from "@/lib/oauth/tokens";
import type { OAuthConnectionRow } from "@/lib/oauth/tokens";

/**
 * Microsoft Graph subscriptions live up to ~3 days. We renew anything
 * expiring in the next ~24h and re-create anything that already expired.
 *
 * Daily cron via Vercel (Hobby-compatible). Auth: Bearer CRON_SECRET.
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
    .select("*")
    .eq("provider", "microsoft");
  if (error) {
    logger.error("OutlookSubCron", "DB error", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const horizon = Date.now() + 24 * 60 * 60 * 1000;
  let renewed = 0;
  let recreated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const meta = (row.metadata ?? {}) as {
      outlook_inbox?: { subscription_id?: string; expiration?: string };
    };
    const expStr = meta.outlook_inbox?.expiration;
    const expMs = expStr ? Date.parse(expStr) : 0;
    const subId = meta.outlook_inbox?.subscription_id;

    if (expMs > horizon && subId) {
      skipped++;
      continue;
    }

    try {
      if (subId && expMs > Date.now()) {
        const accessToken = await getValidAccessToken(row as OAuthConnectionRow);
        await renewOutlookSubscription(accessToken, subId);
        renewed++;
      } else {
        await ensureOutlookInboxSubscription({ teamId: row.team_id });
        recreated++;
      }
    } catch (e) {
      failed++;
      logger.warn("OutlookSubCron", "refresh failed", { team_id: row.team_id, error: e });
    }
  }

  return NextResponse.json({ ok: true, renewed, recreated, skipped, failed });
}
