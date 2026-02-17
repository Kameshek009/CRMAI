import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isDirector);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Generate cryptographically strong invite code
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);

    const { data, error: dbError } = await supabase
      .from("teams")
      .update({ invite_code: code })
      .eq("id", id)
      .select("invite_code")
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
