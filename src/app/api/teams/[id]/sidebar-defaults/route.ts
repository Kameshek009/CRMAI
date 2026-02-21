import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { sidebarConfigSchema } from "@/lib/validations/sidebar";

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

    const { data: team } = await createSupabaseAdmin()
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      data: team?.settings?.sidebar_defaults || null,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = sidebarConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid sidebar config" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Fetch current settings and merge
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    const currentSettings = team?.settings || {};
    const newSettings = { ...currentSettings, sidebar_defaults: parsed.data };

    const { error: dbError } = await supabase
      .from("teams")
      .update({ settings: newSettings })
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: parsed.data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    const currentSettings = team?.settings || {};
    delete currentSettings.sidebar_defaults;

    const { error: dbError } = await supabase
      .from("teams")
      .update({ settings: currentSettings })
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
