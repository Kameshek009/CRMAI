import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { createConnectionSchema } from "@/lib/crm/team-validation";

export const GET = withApiHandler(
  { logTag: "TeamConnections" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: connections, error: dbError } = await supabase
      .from("team_connections")
      .select("*, requester:teams!team_connections_requester_team_id_fkey(id, name), target:teams!team_connections_target_team_id_fkey(id, name)")
      .or(`requester_team_id.eq.${id},target_team_id.eq.${id}`)
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data: connections });
  }
);

export const POST = withApiHandler(
  {
    bodySchema: createConnectionSchema,
    logTag: "TeamConnections",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Find target team by connection code
    const { data: targetTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("invite_code", body.connection_code)
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
        connection_code: body.connection_code,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data });
  }
);
