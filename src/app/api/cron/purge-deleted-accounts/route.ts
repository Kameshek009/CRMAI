import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { DELETION_GRACE_MS } from "@/lib/gdpr/config";
import { logger } from "@/lib/logger";

/**
 * Hard-deletes accounts whose `deletion_requested_at` is older than the
 * grace period. Triggered daily by Vercel Cron. Auth: Bearer CRON_SECRET.
 *
 * Per account:
 *   1. Call DB function purge_account() — nullifies actor pointers, drops
 *      owner-only rows, deletes the account (cascading the rest).
 *   2. Delete the matching Clerk user so the email can be reused.
 *
 * Clerk deletion happens after the DB purge. If Clerk fails, the row is
 * already gone — we log and rely on Clerk's own cleanup. Doing it in the
 * other order would risk a stuck Clerk user with no DB account.
 */

async function deleteClerkUser(clerkUserId: string): Promise<{ ok: boolean; status: number }> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return { ok: false, status: 0 };
  const resp = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
  });
  return { ok: resp.ok, status: resp.status };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const threshold = new Date(Date.now() - DELETION_GRACE_MS).toISOString();

  const { data: due, error: fetchErr } = await supabase
    .from("accounts")
    .select("id, clerk_user_id, deletion_requested_at")
    .not("deletion_requested_at", "is", null)
    .lt("deletion_requested_at", threshold);

  if (fetchErr) {
    logger.error("GDPR", "Failed to fetch accounts due for purge", fetchErr);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ success: true, purged: 0 });
  }

  let purged = 0;
  let clerkFailed = 0;
  const errors: Array<{ account_id: string; error: string }> = [];

  for (const acc of due) {
    const { error: rpcErr } = await supabase.rpc("purge_account", { p_account_id: acc.id });
    if (rpcErr) {
      errors.push({ account_id: acc.id, error: rpcErr.message });
      logger.error("GDPR", `purge_account failed for ${acc.id}`, rpcErr);
      continue;
    }
    purged++;

    if (acc.clerk_user_id) {
      const clerk = await deleteClerkUser(acc.clerk_user_id);
      if (!clerk.ok && clerk.status !== 404) {
        clerkFailed++;
        logger.error(
          "GDPR",
          `Clerk delete failed for ${acc.clerk_user_id} (status=${clerk.status})`,
        );
      }
    }
  }

  logger.info("GDPR", `Purge cycle: purged=${purged} clerk_failed=${clerkFailed} errors=${errors.length}`);

  return NextResponse.json({
    success: true,
    purged,
    clerk_failed: clerkFailed,
    errors,
  });
}
