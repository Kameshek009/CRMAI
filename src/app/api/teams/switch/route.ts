import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { switchTeamSchema } from "@/lib/crm/team-validation";

export async function POST(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const body = await request.json();
    const parsed = switchTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Verify membership
    const { data: member } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", parsed.data.team_id)
      .eq("account_id", accountId)
      .eq("status", "active")
      .single();

    if (!member) {
      return NextResponse.json({ success: false, error: "Not a member of this team" }, { status: 403 });
    }

    // Update current_team_id
    await supabase
      .from("accounts")
      .update({ current_team_id: parsed.data.team_id })
      .eq("id", accountId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
