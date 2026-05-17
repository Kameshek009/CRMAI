import type { RuleCondition } from "./types";

// One-click "install common rules" seed. Picked to cover the typical
// signals: has-contact-info, B2B context, lead source, status.
export type RuleTemplate = {
  name: string;
  description: string;
  condition: RuleCondition;
  weight: number;
};

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    name: "Has phone number",
    description: "Lead provided any phone number (mobile or landline).",
    condition: { field: "phone", operator: "not_empty" },
    weight: 15,
  },
  {
    name: "Has valid email",
    description: "Lead provided an email address.",
    condition: { field: "email", operator: "not_empty" },
    weight: 10,
  },
  {
    name: "B2B lead",
    description: "Lead has a company / organization filled in.",
    condition: { field: "organization", operator: "not_empty" },
    weight: 10,
  },
  {
    name: "From referral",
    description: "Lead source is a referral — historically converts the highest.",
    condition: { field: "source", operator: "eq", value: "referral" },
    weight: 25,
  },
  {
    name: "Senior decision-maker",
    description: "Job title looks like a decision-maker (CEO/CTO/CFO/Director/VP/Head of).",
    condition: {
      field: "job_title",
      operator: "regex",
      value: "(?i)(ceo|cto|cfo|coo|director|vp |head of|founder)",
    },
    weight: 20,
  },
  {
    name: "Qualified",
    description: "Sales team marked the lead as qualified.",
    condition: { field: "status", operator: "eq", value: "qualified" },
    weight: 30,
  },
];
