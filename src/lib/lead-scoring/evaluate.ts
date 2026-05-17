import { evaluateOperator, getFieldValue } from "./operators";
import {
  type LeadLike,
  type RuleMatch,
  type ScoreResult,
  type ScoringRule,
  SCORE_MAX,
  SCORE_MIN,
} from "./types";

function clamp(n: number): number {
  if (n < SCORE_MIN) return SCORE_MIN;
  if (n > SCORE_MAX) return SCORE_MAX;
  return Math.round(n);
}

// Pure: applies every active rule to the lead, returns total + per-rule
// breakdown. Inactive rules are skipped completely (not included in breakdown).
export function evaluateRules(lead: LeadLike, rules: ScoringRule[]): ScoreResult {
  const breakdown: RuleMatch[] = [];
  let raw = 0;
  for (const rule of rules) {
    if (!rule.is_active) continue;
    const value = getFieldValue(lead, rule.condition.field);
    const matched = evaluateOperator(value, rule.condition.operator, rule.condition.value);
    const contribution = matched ? rule.weight : 0;
    raw += contribution;
    breakdown.push({
      rule_id: rule.id,
      name: rule.name,
      matched,
      contribution,
    });
  }
  return { score: clamp(raw), raw, breakdown };
}
