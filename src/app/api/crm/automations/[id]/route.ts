import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { isValidUUID } from "@/lib/crm/helpers";
import { z } from "zod";

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

export const PATCH = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: updateAutomationSchema,
    logTag: "Automations",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("automations")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "Automations",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("automations")
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete", 500);

    return NextResponse.json({ success: true });
  }
);
