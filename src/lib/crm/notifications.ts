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

    // Map notification type to preference key (from account settings)
    const prefMap: Record<string, string> = {
      deal_assigned: "deal_assigned",
      deal_stage_changed: "deal_assigned",
      task_due_soon: "task_due",
      task_overdue: "task_due",
      new_team_member: "new_team_member",
      goal_achieved: "deal_assigned",
    };

    const prefKey = prefMap[params.type];
    if (prefKey && prefs[prefKey] === false) return;

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
    logger.error("Notifications", "Failed to create notification", err);
  }
}
