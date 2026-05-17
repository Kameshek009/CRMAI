// Tables included in a GDPR Art. 20 data export.
//
// Two scopes:
//   - PERSONAL: filtered by account_id = subject. These are the subject's own
//     rows regardless of team.
//   - TEAM_OWNED: filtered by team_id IN (teams the subject owns). Only teams
//     where the subject is the sole/primary owner are exported in full —
//     other members' teams are not the subject's data to copy.
//
// `exclude` strips columns that are sensitive ciphertext (the user cannot
// decrypt them anyway) or pure internal bookkeeping that has no portability
// value.

export type ExportTableSpec = {
  table: string;
  exclude?: string[];
};

export const PERSONAL_TABLES: ExportTableSpec[] = [
  { table: "login_history" },
  { table: "desktop_sessions", exclude: ["refresh_token_hash"] },
  { table: "chats" },
  { table: "notifications" },
  { table: "vision_boards" },
  { table: "sync_log" },
  { table: "payment_history" },
  { table: "team_members" },
  { table: "visibility_group_members" },
];

export const TEAM_OWNED_TABLES: ExportTableSpec[] = [
  { table: "teams" },
  { table: "team_roles" },
  { table: "team_members" },
  { table: "team_invites" },
  { table: "contacts" },
  { table: "companies" },
  { table: "deals" },
  { table: "leads" },
  { table: "crm_activities" },
  { table: "crm_notes" },
  { table: "crm_tasks" },
  { table: "call_logs" },
  { table: "email_communications" },
  { table: "email_templates" },
  { table: "email_sequences" },
  { table: "automations" },
  { table: "dashboard_layouts" },
  { table: "deal_stages" },
  { table: "deal_lost_reasons" },
  { table: "goals" },
  { table: "property_showings" },
  { table: "whatsapp_messages" },
  { table: "web_forms" },
  { table: "web_form_submissions" },
  { table: "field_definitions" },
  { table: "saved_views" },
  { table: "visibility_groups" },
  { table: "visibility_group_members" },
  { table: "currency_rates" },
  { table: "ai_permissions" },
  { table: "merge_log" },
  { table: "audit_log" },
  { table: "oauth_tokens", exclude: ["access_token_encrypted", "refresh_token_encrypted"] },
  { table: "api_keys", exclude: ["key_hash"] },
  { table: "webhook_endpoints", exclude: ["secret_encrypted", "secret_hash"] },
];

export function stripExcluded<T extends Record<string, unknown>>(
  rows: T[],
  exclude?: string[],
): T[] {
  if (!exclude || exclude.length === 0) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const col of exclude) delete copy[col];
    return copy;
  });
}
