import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface Condition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains";
  value: unknown;
}

interface AutomationAction {
  type: "create_task" | "update_field" | "assign_to";
  config: Record<string, unknown>;
}

export interface Automation {
  id: string;
  team_id: string;
  name: string;
  is_active: boolean;
  run_count: number;
  trigger_type: string;
  trigger_config: {
    entity_type?: string;
    field?: string;
    from?: string;
    to?: string;
  };
  conditions: Condition[];
  actions: AutomationAction[];
}

export interface TriggerParams {
  teamId: string;
  accountId: string;
  triggerType: "record_created" | "record_updated" | "field_changed" | "deal_stage_changed";
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  record: Record<string, unknown>;
}

// ============================================================================
// Condition evaluation
// ============================================================================

/** @internal — exported for testing */
export function evaluateCondition(condition: Condition, record: Record<string, unknown>): boolean {
  const fieldValue = record[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case "eq":
      return String(fieldValue) === String(targetValue);
    case "neq":
      return String(fieldValue) !== String(targetValue);
    case "gt":
      return Number(fieldValue) > Number(targetValue);
    case "gte":
      return Number(fieldValue) >= Number(targetValue);
    case "lt":
      return Number(fieldValue) < Number(targetValue);
    case "lte":
      return Number(fieldValue) <= Number(targetValue);
    case "contains":
      return String(fieldValue || "").toLowerCase().includes(String(targetValue).toLowerCase());
    case "not_contains":
      return !String(fieldValue || "").toLowerCase().includes(String(targetValue).toLowerCase());
    default:
      return false;
  }
}

/** @internal — exported for testing */
export function evaluateConditions(conditions: Condition[], record: Record<string, unknown>): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, record));
}

// ============================================================================
// Trigger matching
// ============================================================================

/** @internal — exported for testing */
export function matchesTrigger(
  automation: Automation,
  params: TriggerParams
): boolean {
  const { trigger_type, trigger_config } = automation;

  // Check trigger type
  if (trigger_type !== params.triggerType) return false;

  // Check entity type
  if (trigger_config.entity_type && trigger_config.entity_type !== params.entityType) return false;

  // For field_changed trigger, check specific field
  if (trigger_type === "field_changed" && trigger_config.field && params.changes) {
    const change = params.changes[trigger_config.field];
    if (!change) return false;
    if (trigger_config.from && String(change.old) !== trigger_config.from) return false;
    if (trigger_config.to && String(change.new) !== trigger_config.to) return false;
  }

  // For deal_stage_changed, check stage changes
  if (trigger_type === "deal_stage_changed" && params.changes) {
    const stageChange = params.changes["stage_id"];
    if (!stageChange) return false;
  }

  return true;
}

// ============================================================================
// Action execution
// ============================================================================

async function executeAction(
  action: AutomationAction,
  params: TriggerParams,
  supabase: ReturnType<typeof createSupabaseAdmin>
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case "create_task": {
        const config = action.config;
        await supabase.from("crm_tasks").insert({
          team_id: params.teamId,
          account_id: params.accountId,
          title: String(config.title || "Auto-generated task"),
          description: config.description ? String(config.description) : null,
          priority: config.priority ? String(config.priority) : "medium",
          status: "todo",
          contact_id: params.entityType === "contact" ? params.entityId : null,
          deal_id: params.entityType === "deal" ? params.entityId : null,
          due_date: config.due_in_days
            ? new Date(Date.now() + Number(config.due_in_days) * 86400000).toISOString().split("T")[0]
            : null,
          is_ai_generated: true,
        });
        return { success: true };
      }

      case "update_field": {
        const config = action.config;
        const field = String(config.field);
        const value = config.value;
        const table = params.entityType === "contact" ? "contacts"
          : params.entityType === "company" ? "companies"
          : params.entityType === "deal" ? "deals"
          : null;

        if (!table) return { success: false, error: `Unknown entity type: ${params.entityType}` };

        await supabase
          .from(table)
          .update({ [field]: value })
          .eq("id", params.entityId)
          .eq("team_id", params.teamId);

        return { success: true };
      }

      case "assign_to": {
        const config = action.config;
        const assigneeId = String(config.account_id);
        const table = params.entityType === "contact" ? "contacts"
          : params.entityType === "deal" ? "deals"
          : null;

        if (!table) return { success: false, error: `Entity type ${params.entityType} does not support assignment` };

        await supabase
          .from(table)
          .update({ assigned_to: assigneeId })
          .eq("id", params.entityId)
          .eq("team_id", params.teamId);

        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Main engine
// ============================================================================

export async function runAutomations(params: TriggerParams): Promise<void> {
  try {
    const supabase = createSupabaseAdmin();

    // Fetch active automations for this team
    const { data: automations, error } = await supabase
      .from("automations")
      .select("*")
      .eq("team_id", params.teamId)
      .eq("is_active", true);

    if (error || !automations || automations.length === 0) return;

    for (const automation of automations as Automation[]) {
      // Check if trigger matches
      if (!matchesTrigger(automation, params)) continue;

      // Evaluate conditions
      if (!evaluateConditions(automation.conditions, params.record)) {
        // Log as skipped
        const { error: skipErr } = await supabase.from("automation_logs").insert({
          automation_id: automation.id,
          trigger_data: { entityType: params.entityType, entityId: params.entityId },
          actions_executed: [],
          status: "skipped",
        });
        if (skipErr) logger.error("Automations", "Failed to log skipped automation", skipErr);
        continue;
      }

      // Execute actions
      const executedActions: { type: string; success: boolean; error?: string }[] = [];
      let hasError = false;

      for (const action of automation.actions) {
        const result = await executeAction(action, params, supabase);
        executedActions.push({ type: action.type, ...result });
        if (!result.success) hasError = true;
      }

      // Update run count
      await supabase
        .from("automations")
        .update({ run_count: (automation.run_count || 0) + 1, last_run_at: new Date().toISOString() })
        .eq("id", automation.id);

      // Log execution
      await supabase.from("automation_logs").insert({
        automation_id: automation.id,
        trigger_data: { entityType: params.entityType, entityId: params.entityId, triggerType: params.triggerType },
        actions_executed: executedActions,
        status: hasError ? "error" : "success",
        error_message: hasError ? executedActions.filter((a) => !a.success).map((a) => a.error).join("; ") : null,
      });
    }
  } catch (error) {
    logger.error("Automations", "Failed to run automations", error);
  }
}
