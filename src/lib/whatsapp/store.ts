/**
 * Read / write the encrypted WhatsApp settings row for a workspace.
 *
 * All token I/O goes through here so the AES-256-GCM encryption + the
 * MIGRATION_PLAINTEXT sentinel are handled in one place.
 *
 * The sentinel exists because migration 059 backfilled rows from the old
 * `teams.settings.whatsapp` jsonb without access to the encryption key
 * (SQL-level). Those rows carry `MIGRATION_PLAINTEXT:<raw token>` until the
 * user re-saves via the settings UI; we refuse to use them so we don't
 * accidentally double-encrypt or decrypt-fail.
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/api-auth/token-crypto";

export const MIGRATION_PLAINTEXT_PREFIX = "MIGRATION_PLAINTEXT:";

export type WhatsAppConnectionOrigin = "byo" | "embedded_signup";

export interface WhatsAppSettingsRow {
  id: string;
  team_id: string;
  phone_number_id: string;
  waba_id: string;
  access_token_encrypted: string;
  app_secret_encrypted: string | null;
  webhook_verify_token: string;
  origin: WhatsAppConnectionOrigin;
  display_name: string | null;
  is_connected: boolean;
  last_verified_at: string | null;
  metadata: Record<string, unknown>;
}

export interface WhatsAppRuntimeConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string | null;
  webhookVerifyToken: string;
  origin: WhatsAppConnectionOrigin;
}

export class WhatsAppMigrationPlaintextError extends Error {
  constructor() {
    super(
      "WhatsApp access_token is still in pre-migration plaintext — re-save settings to encrypt.",
    );
    this.name = "WhatsAppMigrationPlaintextError";
  }
}

export async function getWhatsAppSettingsRow(teamId: string): Promise<WhatsAppSettingsRow | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("whatsapp_settings")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();
  return (data as WhatsAppSettingsRow) ?? null;
}

export async function getWhatsAppSettingsByPhoneNumberId(
  phoneNumberId: string,
): Promise<WhatsAppSettingsRow | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("whatsapp_settings")
    .select("*")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();
  return (data as WhatsAppSettingsRow) ?? null;
}

function decryptOrThrow(value: string): string {
  if (value.startsWith(MIGRATION_PLAINTEXT_PREFIX)) {
    throw new WhatsAppMigrationPlaintextError();
  }
  return decryptToken(value);
}

export function rowToRuntimeConfig(row: WhatsAppSettingsRow): WhatsAppRuntimeConfig {
  return {
    phoneNumberId: row.phone_number_id,
    wabaId: row.waba_id,
    accessToken: decryptOrThrow(row.access_token_encrypted),
    appSecret: row.app_secret_encrypted ? decryptOrThrow(row.app_secret_encrypted) : null,
    webhookVerifyToken: row.webhook_verify_token,
    origin: row.origin,
  };
}

export async function getWhatsAppRuntimeConfig(
  teamId: string,
): Promise<WhatsAppRuntimeConfig | null> {
  const row = await getWhatsAppSettingsRow(teamId);
  if (!row) return null;
  return rowToRuntimeConfig(row);
}

export interface UpsertWhatsAppSettingsInput {
  teamId: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret?: string | null;
  webhookVerifyToken?: string;
  origin?: WhatsAppConnectionOrigin;
  displayName?: string | null;
  metadata?: Record<string, unknown>;
}

export async function upsertWhatsAppSettings(
  input: UpsertWhatsAppSettingsInput,
): Promise<WhatsAppSettingsRow> {
  const supabase = createSupabaseAdmin();
  const existing = await getWhatsAppSettingsRow(input.teamId);

  const payload: Record<string, unknown> = {
    team_id: input.teamId,
    phone_number_id: input.phoneNumberId,
    waba_id: input.wabaId,
    access_token_encrypted: encryptToken(input.accessToken),
    webhook_verify_token:
      input.webhookVerifyToken ?? existing?.webhook_verify_token ?? generateVerifyToken(),
    origin: input.origin ?? existing?.origin ?? "byo",
  };
  if (input.appSecret !== undefined) {
    payload.app_secret_encrypted = input.appSecret ? encryptToken(input.appSecret) : null;
  }
  if (input.displayName !== undefined) payload.display_name = input.displayName;
  if (input.metadata) payload.metadata = input.metadata;

  if (existing) {
    const { data, error } = await supabase
      .from("whatsapp_settings")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`whatsapp_settings update failed: ${error.message}`);
    return data as WhatsAppSettingsRow;
  }

  const { data, error } = await supabase
    .from("whatsapp_settings")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`whatsapp_settings insert failed: ${error.message}`);
  return data as WhatsAppSettingsRow;
}

export async function setWhatsAppConnectedFlag(
  teamId: string,
  isConnected: boolean,
  displayName?: string | null,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const update: Record<string, unknown> = {
    is_connected: isConnected,
    last_verified_at: isConnected ? new Date().toISOString() : null,
  };
  if (displayName !== undefined) update.display_name = displayName;
  await supabase.from("whatsapp_settings").update(update).eq("team_id", teamId);
}

export async function deleteWhatsAppSettings(teamId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("whatsapp_settings").delete().eq("team_id", teamId);
}

function generateVerifyToken(): string {
  // Avoid pulling node:crypto here — the caller (settings POST) already
  // generates one with randomBytes when needed. Cheap fallback for unit
  // tests / unusual paths.
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * Helper for safely revealing a masked preview of an encrypted token —
 * used by the UI status endpoint so the customer can sanity-check the row.
 * Never returns the full plaintext.
 */
export function maskEncryptedToken(encrypted: string | null): string | null {
  if (!encrypted) return null;
  if (encrypted.startsWith(MIGRATION_PLAINTEXT_PREFIX)) {
    const raw = encrypted.slice(MIGRATION_PLAINTEXT_PREFIX.length);
    if (!raw) return null;
    return `${raw.slice(0, 4)}...${raw.slice(-4)} (legacy)`;
  }
  try {
    const decoded = decryptToken(encrypted);
    return `${decoded.slice(0, 4)}...${decoded.slice(-4)}`;
  } catch {
    return null;
  }
}
