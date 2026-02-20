import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface NotificationParams {
  accountId: string;
  teamId: string;
  type: string;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Create an in-app notification. Fire-and-forget — never throws.
 */
export async function createNotification(params: NotificationParams): Promise<void> {
  try {
    const supabase = createSupabaseAdmin();

    // Check notification preferences
    const { data: account } = await supabase
      .from("accounts")
      .select("notification_preferences")
      .eq("id", params.accountId)
      .single();

    const prefs = (account?.notification_preferences || {}) as Record<string, boolean>;

    // Map notification type to preference key
    const prefMap: Record<string, string> = {
      deal_assigned: "inApp",
      task_due_soon: "inApp",
      task_overdue: "inApp",
      deal_stage_changed: "dealUpdates",
      new_team_member: "teamUpdates",
      goal_achieved: "inApp",
    };

    const prefKey = prefMap[params.type] || "inApp";
    if (prefs[prefKey] === false) return;

    await supabase.from("notifications").insert({
      account_id: params.accountId,
      team_id: params.teamId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
    });
  } catch (err) {
    logger.warn("Notifications", "Failed to create notification", err);
  }
}
