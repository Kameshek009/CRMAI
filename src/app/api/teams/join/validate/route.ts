import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";

export async function GET(request: NextRequest) {
  try {
    const { error } = await getAccountId();
    if (error) return error;

    const code = new URL(request.url).searchParams.get("code");
    if (!code) {
      return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: team } = await supabase
      .from("teams")
      .select("id, name, description, max_members")
      .eq("invite_code", code)
      .single();

    if (!team) {
      return NextResponse.json({ success: false, error: "Invalid invite code" }, { status: 404 });
    }

    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "active");

    return NextResponse.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: count || 0,
        maxMembers: team.max_members,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
