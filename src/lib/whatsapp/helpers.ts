import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { WhatsAppConfig } from "./client";
import {
  getWhatsAppRuntimeConfig,
  getWhatsAppSettingsByPhoneNumberId,
  WhatsAppMigrationPlaintextError,
} from "./store";
import { logger } from "@/lib/logger";

/**
 * Load WhatsApp config for a workspace. Decrypts the access token through
 * `store.ts`. Returns null when no row exists; throws
 * `WhatsAppMigrationPlaintextError` when the row is still in pre-migration
 * plaintext (caller should surface a "re-save settings" hint).
 */
export async function getWhatsAppConfig(
  teamId: string,
): Promise<(WhatsAppConfig & { webhookVerifyToken: string; appSecret: string | null }) | null> {
  const cfg = await getWhatsAppRuntimeConfig(teamId);
  if (!cfg) return null;
  return {
    phoneNumberId: cfg.phoneNumberId,
    accessToken: cfg.accessToken,
    wabaId: cfg.wabaId,
    webhookVerifyToken: cfg.webhookVerifyToken,
    appSecret: cfg.appSecret,
  };
}

/**
 * O(1) lookup by phone_number_id (UNIQUE index in migration 059) replaces
 * the old full-team scan over `teams.settings`.
 */
export async function findTeamByPhoneNumberId(
  phoneNumberId: string,
): Promise<{
  teamId: string;
  accountId: string;
  webhookVerifyToken: string;
  appSecret: string | null;
  accessToken: string;
} | null> {
  const row = await getWhatsAppSettingsByPhoneNumberId(phoneNumberId);
  if (!row) return null;
  let accessToken: string;
  let appSecret: string | null;
  try {
    const supabase = createSupabaseAdmin();
    const { data: team } = await supabase
      .from("teams")
      .select("owner_account_id")
      .eq("id", row.team_id)
      .single();
    if (!team) return null;
    const cfg = await getWhatsAppRuntimeConfig(row.team_id);
    if (!cfg) return null;
    accessToken = cfg.accessToken;
    appSecret = cfg.appSecret;
    return {
      teamId: row.team_id,
      accountId: team.owner_account_id,
      webhookVerifyToken: row.webhook_verify_token,
      appSecret,
      accessToken,
    };
  } catch (e) {
    if (e instanceof WhatsAppMigrationPlaintextError) {
      logger.warn("WhatsApp", `Row for phone_number_id ${phoneNumberId} is pre-migration plaintext — needs re-save`);
      return null;
    }
    throw e;
  }
}

/**
 * Try to match a phone number to an existing contact.
 * Strips common formatting to do a loose match.
 */
export async function findContactByPhone(teamId: string, phone: string): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  // Normalize: strip non-digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;

  // Try exact match with common formats
  const variants = [
    phone,              // original
    `+${digits}`,       // +7999...
    digits,             // 7999...
  ];

  for (const variant of variants) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .eq("phone", variant)
      .limit(1)
      .maybeSingle();

    if (data?.id) return data.id;
  }

  // Fallback: suffix match on last 10 digits (parameterized)
  const suffix = digits.slice(-10);
  const { data: fallback } = await supabase
    .from("contacts")
    .select("id")
    .eq("team_id", teamId)
    .eq("is_deleted", false)
    .ilike("phone", `%${suffix}`)
    .limit(1)
    .maybeSingle();

  return fallback?.id || null;
}
