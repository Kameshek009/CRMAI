import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { findBlockingOwnedTeams } from "@/lib/gdpr/sole-owner";
import { DELETION_GRACE_DAYS } from "@/lib/gdpr/config";
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

  if (account.deletion_requested_at) {
    return NextResponse.json(
      {
        success: false,
        error: "Deletion already scheduled",
        deletion_requested_at: account.deletion_requested_at,
      },
      { status: 409 },
    );
  }

  const blocking = await findBlockingOwnedTeams(supabase, account.id);
  if (blocking.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "transfer_ownership_required",
        message:
          "You own teams that still have other active members. Transfer ownership or remove members before deleting your account.",
        blocking_teams: blocking,
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("accounts")
    .update({
      deletion_requested_at: now,
      is_active: false,
      deactivated_at: now,
    })
    .eq("id", account.id);

  if (updateErr) {
    logger.error("GDPR", "Failed to schedule deletion", updateErr);
    return NextResponse.json({ success: false, error: "Failed to schedule deletion" }, { status: 500 });
  }

  logger.info("GDPR", `Account deletion scheduled: account_id=${account.id}`);
  return NextResponse.json({
    success: true,
    deletion_requested_at: now,
    grace_period_days: DELETION_GRACE_DAYS,
  });
}
