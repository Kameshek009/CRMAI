import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { createTeamSchema } from "@/lib/crm/team-validation";

export async function POST(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: teamId, error: rpcError } = await supabase.rpc("create_team_with_defaults", {
      p_account_id: accountId,
      p_team_name: parsed.data.name,
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    }

    // Update description if provided
    if (parsed.data.description) {
      await supabase
        .from("teams")
        .update({ description: parsed.data.description })
        .eq("id", teamId);
    }

    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    return NextResponse.json({ success: true, data: team });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
