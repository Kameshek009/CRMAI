import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { loadRules, recomputeLeadScore } from "@/lib/lead-scoring/recompute";

const BATCH_SIZE = 200;

// Nightly recompute. Picks up the case where the team modified rules
// during the day — per-lead writes already keep individual leads fresh,
// but a weight change applies to everyone.
//
// Bearer CRON_SECRET. Iterates only teams with at least one active rule;
// a workspace with no rules wastes no work.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: teams, error: teamsErr } = await supabase
    .from("lead_scoring_rules")
    .select("team_id")
    .eq("is_active", true);
  if (teamsErr) {
    logger.error("LeadScoringCron", "Failed to load teams", teamsErr);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }

  const teamIds = Array.from(new Set((teams ?? []).map((r) => r.team_id as string)));
  if (teamIds.length === 0) {
    return NextResponse.json({ success: true, teams: 0, leads_scored: 0 });
  }

  let totalScored = 0;
  let teamsProcessed = 0;
  const failures: string[] = [];

  for (const teamId of teamIds) {
    try {
      const rules = await loadRules(supabase, teamId);
      if (rules.length === 0) continue;

      let from = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from("leads")
          .select("*")
          .eq("team_id", teamId)
          .eq("is_deleted", false)
          .is("converted_at", null)
          .range(from, from + BATCH_SIZE - 1);
        if (error) {
          failures.push(teamId);
          break;
        }
        if (!batch || batch.length === 0) break;

        for (const lead of batch) {
          const result = await recomputeLeadScore(supabase, lead, rules);
          if (result !== null) totalScored++;
        }
        if (batch.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }
      teamsProcessed++;
    } catch (err) {
      logger.error("LeadScoringCron", `Team ${teamId} failed`, err);
      failures.push(teamId);
    }
  }

  logger.info(
    "LeadScoringCron",
    `Recompute cycle: teams=${teamsProcessed}/${teamIds.length} leads_scored=${totalScored} failures=${failures.length}`,
  );

  return NextResponse.json({
    success: true,
    teams: teamsProcessed,
    leads_scored: totalScored,
    failures,
  });
}
