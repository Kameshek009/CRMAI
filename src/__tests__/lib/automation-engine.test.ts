import { describe, it, expect } from "vitest";
import { evaluateCondition, evaluateConditions, matchesTrigger } from "@/lib/crm/automation-engine";
import type { Condition, Automation, TriggerParams } from "@/lib/crm/automation-engine";

describe("evaluateCondition", () => {
  it("should evaluate 'eq' operator with matching values", () => {
    const condition: Condition = { field: "status", operator: "eq", value: "active" };
    const record = { status: "active" };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'eq' operator with non-matching values", () => {
    const condition: Condition = { field: "status", operator: "eq", value: "active" };
    const record = { status: "inactive" };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should evaluate 'neq' operator with different values", () => {
    const condition: Condition = { field: "status", operator: "neq", value: "inactive" };
    const record = { status: "active" };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'neq' operator with same values", () => {
    const condition: Condition = { field: "status", operator: "neq", value: "active" };
    const record = { status: "active" };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should evaluate 'gt' operator with greater value", () => {
    const condition: Condition = { field: "amount", operator: "gt", value: 100 };
    const record = { amount: 150 };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'gt' operator with smaller value", () => {
    const condition: Condition = { field: "amount", operator: "gt", value: 100 };
    const record = { amount: 50 };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should evaluate 'gte' operator with equal value", () => {
    const condition: Condition = { field: "amount", operator: "gte", value: 100 };
    const record = { amount: 100 };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'gte' operator with greater value", () => {
    const condition: Condition = { field: "amount", operator: "gte", value: 100 };
    const record = { amount: 150 };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'lt' operator with smaller value", () => {
    const condition: Condition = { field: "amount", operator: "lt", value: 100 };
    const record = { amount: 50 };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'lt' operator with greater value", () => {
    const condition: Condition = { field: "amount", operator: "lt", value: 100 };
    const record = { amount: 150 };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should evaluate 'lte' operator with equal value", () => {
    const condition: Condition = { field: "amount", operator: "lte", value: 100 };
    const record = { amount: 100 };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'lte' operator with smaller value", () => {
    const condition: Condition = { field: "amount", operator: "lte", value: 100 };
    const record = { amount: 50 };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'contains' operator with matching substring", () => {
    const condition: Condition = { field: "email", operator: "contains", value: "@gmail" };
    const record = { email: "user@gmail.com" };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'contains' operator case-insensitively", () => {
    const condition: Condition = { field: "email", operator: "contains", value: "@GMAIL" };
    const record = { email: "user@gmail.com" };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'contains' operator with non-matching substring", () => {
    const condition: Condition = { field: "email", operator: "contains", value: "@yahoo" };
    const record = { email: "user@gmail.com" };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should evaluate 'not_contains' operator with non-matching substring", () => {
    const condition: Condition = { field: "email", operator: "not_contains", value: "@yahoo" };
    const record = { email: "user@gmail.com" };
    expect(evaluateCondition(condition, record)).toBe(true);
  });

  it("should evaluate 'not_contains' operator with matching substring", () => {
    const condition: Condition = { field: "email", operator: "not_contains", value: "@gmail" };
    const record = { email: "user@gmail.com" };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should handle null field value with 'contains' operator", () => {
    const condition: Condition = { field: "description", operator: "contains", value: "test" };
    const record = { description: null };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should handle undefined field value with 'contains' operator", () => {
    const condition: Condition = { field: "description", operator: "contains", value: "test" };
    const record = {};
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should handle null field value with 'eq' operator", () => {
    const condition: Condition = { field: "status", operator: "eq", value: "active" };
    const record = { status: null };
    expect(evaluateCondition(condition, record)).toBe(false);
  });

  it("should handle numeric comparison with string values", () => {
    const condition: Condition = { field: "amount", operator: "gt", value: "100" };
    const record = { amount: "150" };
    expect(evaluateCondition(condition, record)).toBe(true);
  });
});

describe("evaluateConditions", () => {
  it("should return true for empty conditions array", () => {
    const record = { status: "active" };
    expect(evaluateConditions([], record)).toBe(true);
  });

  it("should return true for null conditions", () => {
    const record = { status: "active" };
    expect(evaluateConditions(null as unknown as Condition[], record)).toBe(true);
  });

  it("should return true when all conditions pass", () => {
    const conditions: Condition[] = [
      { field: "status", operator: "eq", value: "active" },
      { field: "amount", operator: "gt", value: 100 },
    ];
    const record = { status: "active", amount: 150 };
    expect(evaluateConditions(conditions, record)).toBe(true);
  });

  it("should return false when any condition fails", () => {
    const conditions: Condition[] = [
      { field: "status", operator: "eq", value: "active" },
      { field: "amount", operator: "gt", value: 100 },
    ];
    const record = { status: "active", amount: 50 };
    expect(evaluateConditions(conditions, record)).toBe(false);
  });

  it("should return false when all conditions fail", () => {
    const conditions: Condition[] = [
      { field: "status", operator: "eq", value: "inactive" },
      { field: "amount", operator: "lt", value: 100 },
    ];
    const record = { status: "active", amount: 150 };
    expect(evaluateConditions(conditions, record)).toBe(false);
  });
});

describe("matchesTrigger", () => {
  const baseAutomation: Automation = {
    id: "auto-1",
    team_id: "team-1",
    name: "Test Automation",
    is_active: true,
    run_count: 0,
    trigger_type: "record_created",
    trigger_config: {},
    conditions: [],
    actions: [],
  };

  it("should match when trigger_type matches", () => {
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "record_created",
      entityType: "contact",
      entityId: "contact-1",
      record: {},
    };
    expect(matchesTrigger(baseAutomation, params)).toBe(true);
  });

  it("should not match when trigger_type differs", () => {
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "record_updated",
      entityType: "contact",
      entityId: "contact-1",
      record: {},
    };
    expect(matchesTrigger(baseAutomation, params)).toBe(false);
  });

  it("should match when entity_type filter matches", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_config: { entity_type: "contact" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "record_created",
      entityType: "contact",
      entityId: "contact-1",
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(true);
  });

  it("should not match when entity_type filter differs", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_config: { entity_type: "deal" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "record_created",
      entityType: "contact",
      entityId: "contact-1",
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(false);
  });

  it("should match field_changed trigger with field in changes", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "field_changed",
      trigger_config: { field: "status" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "field_changed",
      entityType: "contact",
      entityId: "contact-1",
      changes: { status: { old: "inactive", new: "active" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(true);
  });

  it("should not match field_changed trigger when field not in changes", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "field_changed",
      trigger_config: { field: "status" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "field_changed",
      entityType: "contact",
      entityId: "contact-1",
      changes: { email: { old: "old@test.com", new: "new@test.com" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(false);
  });

  it("should match field_changed with specific 'from' value", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "field_changed",
      trigger_config: { field: "status", from: "inactive" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "field_changed",
      entityType: "contact",
      entityId: "contact-1",
      changes: { status: { old: "inactive", new: "active" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(true);
  });

  it("should not match field_changed with wrong 'from' value", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "field_changed",
      trigger_config: { field: "status", from: "pending" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "field_changed",
      entityType: "contact",
      entityId: "contact-1",
      changes: { status: { old: "inactive", new: "active" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(false);
  });

  it("should match field_changed with specific 'to' value", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "field_changed",
      trigger_config: { field: "status", to: "active" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "field_changed",
      entityType: "contact",
      entityId: "contact-1",
      changes: { status: { old: "inactive", new: "active" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(true);
  });

  it("should not match field_changed with wrong 'to' value", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "field_changed",
      trigger_config: { field: "status", to: "pending" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "field_changed",
      entityType: "contact",
      entityId: "contact-1",
      changes: { status: { old: "inactive", new: "active" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(false);
  });

  it("should match field_changed with both 'from' and 'to' values", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "field_changed",
      trigger_config: { field: "status", from: "inactive", to: "active" },
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "field_changed",
      entityType: "contact",
      entityId: "contact-1",
      changes: { status: { old: "inactive", new: "active" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(true);
  });

  it("should match deal_stage_changed trigger when stage_id in changes", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "deal_stage_changed",
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "deal_stage_changed",
      entityType: "deal",
      entityId: "deal-1",
      changes: { stage_id: { old: "stage-1", new: "stage-2" } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(true);
  });

  it("should not match deal_stage_changed when stage_id not in changes", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "deal_stage_changed",
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "deal_stage_changed",
      entityType: "deal",
      entityId: "deal-1",
      changes: { amount: { old: 100, new: 200 } },
      record: {},
    };
    expect(matchesTrigger(automation, params)).toBe(false);
  });

  it("should match deal_stage_changed when no changes provided (skips stage check)", () => {
    const automation: Automation = {
      ...baseAutomation,
      trigger_type: "deal_stage_changed",
    };
    const params: TriggerParams = {
      teamId: "team-1",
      accountId: "acc-1",
      triggerType: "deal_stage_changed",
      entityType: "deal",
      entityId: "deal-1",
      record: {},
    };
    // When changes is undefined, the stage_id check block is skipped entirely
    expect(matchesTrigger(automation, params)).toBe(true);
  });
});
