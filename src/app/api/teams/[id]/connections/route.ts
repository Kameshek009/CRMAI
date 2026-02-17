import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createConnectionSchema } from "@/lib/crm/team-validation";

export async function GET(
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

    const supabase = createSupabaseAdmin();
    const { data: connections, error: dbError } = await supabase
      .from("team_connections")
      .select("*, requester:teams!team_connections_requester_team_id_fkey(id, name), target:teams!team_connections_target_team_id_fkey(id, name)")
      .or(`requester_team_id.eq.${id},target_team_id.eq.${id}`)
      .order("created_at", { ascending: false });

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: connections });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const parsed = createConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Find target team by connection code
    const { data: targetTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("invite_code", parsed.data.connection_code)
      .single();

    if (!targetTeam) {
      return NextResponse.json({ success: false, error: "Team not found with that code" }, { status: 404 });
    }

    if (targetTeam.id === id) {
      return NextResponse.json({ success: false, error: "Cannot connect to yourself" }, { status: 400 });
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from("team_connections")
      .select("id")
      .or(`and(requester_team_id.eq.${id},target_team_id.eq.${targetTeam.id}),and(requester_team_id.eq.${targetTeam.id},target_team_id.eq.${id})`)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: "Connection already exists" }, { status: 409 });
    }

    const { data, error: dbError } = await supabase
      .from("team_connections")
      .insert({
        requester_team_id: id,
        target_team_id: targetTeam.id,
        connection_code: parsed.data.connection_code,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
