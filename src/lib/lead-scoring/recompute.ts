import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateRules } from "./evaluate";
import type { LeadLike, ScoringRule } from "./types";

export async function loadRules(
  supabase: SupabaseClient,
  teamId: string,
): Promise<ScoringRule[]> {
  const { data, error } = await supabase
    .from("lead_scoring_rules")
    .select("id, team_id, name, description, condition, weight, is_active, sort_order")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScoringRule[];
}

// Re-scores a single lead and persists the result. Never throws — scoring
// must not be on the critical path of a lead write. Returns the new score
// on success or null on failure.
export async function recomputeLeadScore(
  supabase: SupabaseClient,
  lead: LeadLike & { id: string; team_id: string },
  rules?: ScoringRule[],
): Promise<number | null> {
  try {
    const activeRules = rules ?? (await loadRules(supabase, lead.team_id));
    const result = evaluateRules(lead, activeRules);
    const { error } = await supabase
      .from("leads")
      .update({
        score: result.score,
        score_breakdown: result.breakdown,
        score_computed_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
    if (error) return null;
    return result.score;
  } catch {
    return null;
  }
}

// Reads the lead by id (only the columns rules can reference), then scores.
// Use this from /api/lead-scoring/recompute when the caller has just an id.
export async function recomputeLeadById(
  supabase: SupabaseClient,
  leadId: string,
): Promise<number | null> {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (error || !lead) return null;
  return recomputeLeadScore(supabase, lead);
}
