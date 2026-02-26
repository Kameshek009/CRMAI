import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

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

export const GET = withApiHandler(
  { logTag: "Automations" },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("automations")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError("Failed to fetch automations", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    featureLimit: "activeAutomations",
    bodySchema: createAutomationSchema,
    logTag: "Automations",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("automations")
      .insert({
        team_id: ctx.workspaceId,
        created_by: ctx.accountId,
        ...body,
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create automation", 500);

    return NextResponse.json({ success: true, data });
  }
);
