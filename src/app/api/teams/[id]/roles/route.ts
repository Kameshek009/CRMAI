import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createRoleSchema } from "@/lib/crm/team-validation";

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
    const { data: roles, error: dbError } = await supabase
      .from("team_roles")
      .select("*")
      .eq("team_id", id)
      .order("priority", { ascending: false });

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: roles });
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
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Default permissions for new custom roles
    const defaultPermissions = {
      contacts: { read: true, create: true, update: true, delete: false },
      companies: { read: true, create: true, update: false, delete: false },
      deals: { read: true, create: true, update: true, delete: false },
      tasks: { read: true, create: true, update: true, delete: false },
      call_logs: { read: true, create: true, update: true, delete: false },
      notes: { read: true, create: true, update: true, delete: false },
      pipeline: { read: true, manage: false },
      analytics: { read: true },
      team_settings: { read: false, manage: false },
      ai_chat: { allowed: true },
    };

    const { data, error: dbError } = await supabase
      .from("team_roles")
      .insert({
        team_id: id,
        name: parsed.data.name,
        color: parsed.data.color || "#6b7280",
        priority: parsed.data.priority,
        permissions: parsed.data.permissions || defaultPermissions,
        is_system: false,
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
