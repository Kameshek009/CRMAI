import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { RULE_TEMPLATES } from "@/lib/lead-scoring/templates";

// Bulk-inserts the predefined rule set. Idempotent: skips templates whose
// `name` already exists in the workspace so calling twice is safe.
export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "LeadScoring",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();

    const { data: existing, error: existingErr } = await supabase
      .from("lead_scoring_rules")
      .select("name")
      .eq("team_id", ctx.workspaceId);
    if (existingErr) throw new ApiError("Failed to load existing rules", 500);

    const existingNames = new Set((existing ?? []).map((r) => r.name));
    const toInsert = RULE_TEMPLATES.filter((t) => !existingNames.has(t.name)).map(
      (t, idx) => ({
        team_id: ctx.workspaceId,
        name: t.name,
        description: t.description,
        condition: t.condition,
        weight: t.weight,
        is_active: true,
        sort_order: idx,
      }),
    );

    if (toInsert.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, skipped: existingNames.size });
    }

    const { data, error } = await supabase
      .from("lead_scoring_rules")
      .insert(toInsert)
      .select("id, name");
    if (error) throw new ApiError("Failed to install templates", 500);

    return NextResponse.json({
      success: true,
      inserted: data?.length ?? 0,
      skipped: RULE_TEMPLATES.length - (data?.length ?? 0),
    });
  },
);
