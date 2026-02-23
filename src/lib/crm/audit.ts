import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface AuditParams {
  teamId: string;
  accountId: string;
  actorName?: string;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  changes?: Record<string, { old: unknown; new: unknown }>;
}

/**
 * Log an audit entry. Fire-and-forget — never throws.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("audit_log").insert({
      team_id: params.teamId,
      account_id: params.accountId,
      actor_name: params.actorName || null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      changes: params.changes || {},
    });
  } catch (err) {
    logger.error("Audit", "Failed to write audit log", err);
  }
}

/**
 * Compute changes between old and new record for audit logging.
 * Returns only fields that actually changed.
 */
export function computeChanges(
  oldRecord: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | undefined {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const [key, newVal] of Object.entries(newData)) {
    const oldVal = oldRecord[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}
