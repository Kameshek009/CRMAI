import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createRuleSchema } from "@/lib/lead-scoring/validation";

const SELECT_COLS =
  "id, name, description, condition, weight, is_active, sort_order, created_at, updated_at";

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "LeadScoring",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("lead_scoring_rules")
      .select(SELECT_COLS)
      .eq("team_id", ctx.workspaceId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new ApiError("Failed to fetch rules", 500);
    return NextResponse.json({ success: true, data });
  },
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: createRuleSchema,
    logTag: "LeadScoring",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("lead_scoring_rules")
      .insert({
        team_id: ctx.workspaceId,
        name: body.name,
        description: body.description ?? null,
        condition: body.condition,
        weight: body.weight,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      })
      .select(SELECT_COLS)
      .single();

    if (error || !data) throw new ApiError("Failed to create rule", 500);
    return NextResponse.json({ success: true, data });
  },
);
