import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/crm/helpers";
import { updateRuleSchema } from "@/lib/lead-scoring/validation";

const SELECT_COLS =
  "id, name, description, condition, weight, is_active, sort_order, created_at, updated_at";

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "LeadScoring",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("lead_scoring_rules")
      .select(SELECT_COLS)
      .eq("team_id", ctx.workspaceId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ApiError("Failed to fetch rule", 500);
    if (!data) {
      return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  },
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: updateRuleSchema,
    logTag: "LeadScoring",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("lead_scoring_rules")
      .update(body)
      .eq("team_id", ctx.workspaceId)
      .eq("id", id)
      .select(SELECT_COLS)
      .maybeSingle();
    if (error) throw new ApiError("Failed to update rule", 500);
    if (!data) {
      return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  },
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "LeadScoring",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from("lead_scoring_rules")
      .delete()
      .eq("team_id", ctx.workspaceId)
      .eq("id", id);
    if (error) throw new ApiError("Failed to delete rule", 500);
    return NextResponse.json({ success: true });
  },
);
