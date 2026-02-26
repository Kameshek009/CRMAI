import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { createRoleSchema } from "@/lib/crm/team-validation";

export const GET = withApiHandler(
  { logTag: "TeamRoles" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: roles, error: dbError } = await supabase
      .from("team_roles")
      .select("*")
      .eq("team_id", id)
      .order("priority", { ascending: false });

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data: roles });
  }
);

export const POST = withApiHandler(
  {
    bodySchema: createRoleSchema,
    logTag: "TeamRoles",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

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
        name: body.name,
        color: body.color || "#6b7280",
        priority: body.priority,
        permissions: body.permissions || defaultPermissions,
        is_system: false,
      })
      .select()
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data });
  }
);
