import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { DELETION_GRACE_MS } from "@/lib/gdpr/config";
import { logger } from "@/lib/logger";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: account, error: accountErr } = await supabase
    .from("accounts")
    .select("id, deletion_requested_at")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (accountErr || !account) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  if (!account.deletion_requested_at) {
    return NextResponse.json(
      { success: false, error: "No pending deletion" },
      { status: 400 },
    );
  }

  const requestedAt = new Date(account.deletion_requested_at).getTime();
  if (Date.now() - requestedAt > DELETION_GRACE_MS) {
    // Past the grace window the purge cron is allowed to delete at any time.
    // Refuse to "undelete" — the caller may have already lost data.
    return NextResponse.json(
      { success: false, error: "Grace period expired; deletion is final" },
      { status: 410 },
    );
  }

  const { error: updateErr } = await supabase
    .from("accounts")
    .update({
      deletion_requested_at: null,
      is_active: true,
      deactivated_at: null,
    })
    .eq("id", account.id);

  if (updateErr) {
    logger.error("GDPR", "Failed to cancel deletion", updateErr);
    return NextResponse.json({ success: false, error: "Failed to cancel deletion" }, { status: 500 });
  }

  logger.info("GDPR", `Account deletion cancelled: account_id=${account.id}`);
  return NextResponse.json({ success: true });
}
