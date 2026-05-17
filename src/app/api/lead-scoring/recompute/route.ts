import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { loadRules, recomputeLeadScore } from "@/lib/lead-scoring/recompute";

const recomputeSchema = z.object({
  lead_id: z.string().uuid().optional(),
});

const BATCH_SIZE = 200;

// POST /api/lead-scoring/recompute
//   { lead_id: "..." }  → re-scores that one lead
//   {}                  → re-scores every non-deleted, non-converted lead
//                         in the caller's workspace
export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: recomputeSchema,
    logTag: "LeadScoring",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const rules = await loadRules(supabase, ctx.workspaceId);

    if (body.lead_id) {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", body.lead_id)
        .eq("team_id", ctx.workspaceId)
        .maybeSingle();
      if (error || !lead) throw new ApiError("Lead not found", 404);

      const score = await recomputeLeadScore(supabase, lead, rules);
      return NextResponse.json({ success: true, scored: 1, score });
    }

    let scored = 0;
    let from = 0;
    while (true) {
      const { data: batch, error } = await supabase
        .from("leads")
        .select("*")
        .eq("team_id", ctx.workspaceId)
        .eq("is_deleted", false)
        .is("converted_at", null)
        .range(from, from + BATCH_SIZE - 1);
      if (error) throw new ApiError("Failed to fetch leads", 500);
      if (!batch || batch.length === 0) break;

      for (const lead of batch) {
        const result = await recomputeLeadScore(supabase, lead, rules);
        if (result !== null) scored++;
      }
      if (batch.length < BATCH_SIZE) break;
      from += BATCH_SIZE;
    }

    return NextResponse.json({ success: true, scored });
  },
);
