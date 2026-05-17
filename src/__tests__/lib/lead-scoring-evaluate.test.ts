import { describe, it, expect } from "vitest";
import { evaluateRules } from "@/lib/lead-scoring/evaluate";
import { RULE_TEMPLATES } from "@/lib/lead-scoring/templates";
import type { ScoringRule } from "@/lib/lead-scoring/types";

function rule(over: Partial<ScoringRule>): ScoringRule {
  return {
    id: over.id ?? "r1",
    team_id: "t1",
    name: over.name ?? "Rule",
    description: null,
    condition: over.condition ?? { field: "phone", operator: "not_empty" },
    weight: over.weight ?? 10,
    is_active: over.is_active ?? true,
    sort_order: over.sort_order ?? 0,
  };
}

describe("evaluateRules", () => {
  it("sums weights of matched rules and clamps to 100", () => {
    const lead = { phone: "555", email: "a@b.com" };
    const rules = [
      rule({ id: "r1", weight: 60, condition: { field: "phone", operator: "not_empty" } }),
      rule({ id: "r2", weight: 60, condition: { field: "email", operator: "not_empty" } }),
    ];
    const result = evaluateRules(lead, rules);
    expect(result.raw).toBe(120);
    expect(result.score).toBe(100);
  });

  it("clamps negative totals to 0", () => {
    const rules = [
      rule({ id: "r1", weight: -50, condition: { field: "status", operator: "eq", value: "junk" } }),
    ];
    const result = evaluateRules({ status: "junk" }, rules);
    expect(result.raw).toBe(-50);
    expect(result.score).toBe(0);
  });

  it("skips inactive rules entirely (not even in breakdown)", () => {
    const rules = [
      rule({ id: "active", weight: 10, is_active: true }),
      rule({ id: "off", weight: 99, is_active: false }),
    ];
    const result = evaluateRules({ phone: "555" }, rules);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]?.rule_id).toBe("active");
    expect(result.score).toBe(10);
  });

  it("breakdown reports matched=false and contribution=0 for misses", () => {
    const rules = [
      rule({ id: "r1", weight: 20, condition: { field: "phone", operator: "not_empty" } }),
    ];
    const result = evaluateRules({ phone: null }, rules);
    expect(result.breakdown[0]!).toMatchObject({ rule_id: "r1", matched: false, contribution: 0 });
    expect(result.score).toBe(0);
  });

  it("supports nested fields via dotted path", () => {
    const rules = [
      rule({ id: "r1", weight: 30, condition: { field: "metadata.budget", operator: "gt", value: 1000 } }),
    ];
    const lead = { metadata: { budget: 5000 } };
    const result = evaluateRules(lead, rules);
    expect(result.score).toBe(30);
  });
});

describe("RULE_TEMPLATES", () => {
  it("has the documented set of presets", () => {
    expect(RULE_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const names = RULE_TEMPLATES.map((t) => t.name);
    expect(names).toContain("Has phone number");
    expect(names).toContain("Qualified");
  });

  it("every template is valid against the evaluator", () => {
    const rules: ScoringRule[] = RULE_TEMPLATES.map((t, idx) =>
      rule({
        id: `tpl-${idx}`,
        name: t.name,
        condition: t.condition,
        weight: t.weight,
      }),
    );
    // Build a "hot" lead that should match most templates.
    const hotLead = {
      phone: "+1-555-0100",
      email: "ceo@acme.com",
      organization: "Acme",
      source: "referral",
      job_title: "CEO",
      status: "qualified",
    };
    const result = evaluateRules(hotLead, rules);
    expect(result.score).toBe(100);
    expect(result.breakdown.every((b) => typeof b.contribution === "number")).toBe(true);
  });
});
