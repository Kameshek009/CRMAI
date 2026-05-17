export const OPERATORS = [
  "eq",
  "ne",
  "gt",
  "lt",
  "gte",
  "lte",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "in",
  "not_in",
  "exists",
  "not_exists",
  "empty",
  "not_empty",
  "regex",
] as const;

export type Operator = (typeof OPERATORS)[number];

export type RuleCondition = {
  // Dotted field path on a lead row. Examples:
  //   "phone", "email", "status"
  //   "metadata.budget" — custom field
  field: string;
  operator: Operator;
  value?: unknown;
};

export type ScoringRule = {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  condition: RuleCondition;
  weight: number;
  is_active: boolean;
  sort_order: number;
};

export type LeadLike = Record<string, unknown>;

export type RuleMatch = {
  rule_id: string;
  name: string;
  matched: boolean;
  contribution: number;
};

export type ScoreResult = {
  score: number;
  raw: number;
  breakdown: RuleMatch[];
};

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;
