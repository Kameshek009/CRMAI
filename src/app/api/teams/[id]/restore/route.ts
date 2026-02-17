import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const RESTORE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    // Get account
    const { data: account } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    // Get team (including soft-deleted)
    const { data: team } = await supabase
      .from("teams")
      .select("id, deleted_at, owner_account_id")
      .eq("id", id)
      .single();

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    if (!team.deleted_at) {
      return NextResponse.json({ success: false, error: "Team is not deleted" }, { status: 400 });
    }

    // Only the owner (director) can restore
    if (team.owner_account_id !== account.id) {
      return NextResponse.json({ success: false, error: "Only the team owner can restore" }, { status: 403 });
    }

    // Check 24h window
    const deletedAt = new Date(team.deleted_at).getTime();
    const now = Date.now();
    if (now - deletedAt > RESTORE_WINDOW_MS) {
      return NextResponse.json(
        { success: false, error: "Restore window expired (24 hours)" },
        { status: 410 }
      );
    }

    // Restore: clear deleted_at
    const { error: dbError } = await supabase
      .from("teams")
      .update({ deleted_at: null })
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Set current_team_id back for the owner
    await supabase
      .from("accounts")
      .update({ current_team_id: id })
      .eq("id", account.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
