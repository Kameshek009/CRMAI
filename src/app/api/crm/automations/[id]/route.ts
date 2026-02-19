import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { isValidUUID } from "@/lib/crm/helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
  trigger_config: z.object({
    entity_type: z.enum(["contact", "company", "deal", "lead"]).optional(),
    field: z.string().max(100).optional(),
    from: z.string().max(200).optional(),
    to: z.string().max(200).optional(),
  }).optional(),
  conditions: z.array(z.object({
    field: z.string().max(100),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "not_contains"]),
    value: z.unknown(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(["create_task", "update_field", "assign_to"]),
    config: z.record(z.string(), z.unknown()),
  })).min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateAutomationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("automations")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Automations", "PATCH error", error);
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

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("automations")
      .delete()
      .eq("id", id)
      .eq("team_id", context.workspaceId);

    if (dbError) {
      logger.error("Automations", "Failed to delete", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Automations", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
