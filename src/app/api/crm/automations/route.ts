import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { logger } from "@/lib/logger";

const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  trigger_type: z.enum(["record_created", "record_updated", "field_changed", "deal_stage_changed"]),
  trigger_config: z.object({
    entity_type: z.enum(["contact", "company", "deal", "lead"]).optional(),
    field: z.string().max(100).optional(),
    from: z.string().max(200).optional(),
    to: z.string().max(200).optional(),
  }),
  conditions: z.array(z.object({
    field: z.string().max(100),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "not_contains"]),
    value: z.unknown(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(["create_task", "update_field", "assign_to"]),
    config: z.record(z.string(), z.unknown()),
  })).min(1),
});

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("automations")
      .select("*")
      .eq("team_id", context.workspaceId)
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("Automations", "Failed to fetch", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch automations" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Automations", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const limitError = await requireFeatureLimit(context.workspaceId, context.tier, "activeAutomations");
    if (limitError) return limitError;

    const body = await request.json();
    const parsed = createAutomationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("automations")
      .insert({
        team_id: context.workspaceId,
        created_by: context.accountId,
        ...parsed.data,
      })
      .select()
      .single();

    if (dbError) {
      logger.error("Automations", "Failed to create", dbError);
      return NextResponse.json({ success: false, error: "Failed to create automation" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Automations", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
