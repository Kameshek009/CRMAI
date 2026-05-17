/**
 * `telephony_settings` table accessor — encrypts/decrypts Twilio (or
 * future Mango) creds via the shared TOKEN_ENCRYPTION_KEY.
 *
 * Same mental model as `whatsapp/store.ts`: callers never see the raw
 * encrypted strings; runtime config is the only public type.
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/api-auth/token-crypto";
import type {
  TelephonyCredentials,
  TelephonyProviderId,
} from "./types";

export interface TelephonySettingsRow {
  id: string;
  team_id: string;
  provider: TelephonyProviderId;
  account_sid: string;
  auth_token_encrypted: string;
  from_number: string;
  api_key_sid_encrypted: string | null;
  api_key_secret_encrypted: string | null;
  is_connected: boolean;
  last_verified_at: string | null;
  metadata: Record<string, unknown>;
}

export async function getTelephonySettings(teamId: string): Promise<TelephonySettingsRow | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("telephony_settings")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();
  return (data as TelephonySettingsRow) ?? null;
}

export function rowToCredentials(row: TelephonySettingsRow): TelephonyCredentials {
  return {
    accountSid: row.account_sid,
    authToken: decryptToken(row.auth_token_encrypted),
    fromNumber: row.from_number,
    apiKeySid: row.api_key_sid_encrypted ? decryptToken(row.api_key_sid_encrypted) : null,
    apiKeySecret: row.api_key_secret_encrypted ? decryptToken(row.api_key_secret_encrypted) : null,
  };
}

export async function getTelephonyCredentials(
  teamId: string,
): Promise<TelephonyCredentials | null> {
  const row = await getTelephonySettings(teamId);
  if (!row) return null;
  return rowToCredentials(row);
}

export interface UpsertTelephonyInput {
  teamId: string;
  provider: TelephonyProviderId;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  apiKeySid?: string | null;
  apiKeySecret?: string | null;
  metadata?: Record<string, unknown>;
}

export async function upsertTelephonySettings(
  input: UpsertTelephonyInput,
): Promise<TelephonySettingsRow> {
  const supabase = createSupabaseAdmin();
  const existing = await getTelephonySettings(input.teamId);

  const payload: Record<string, unknown> = {
    team_id: input.teamId,
    provider: input.provider,
    account_sid: input.accountSid,
    auth_token_encrypted: encryptToken(input.authToken),
    from_number: input.fromNumber,
  };
  if (input.apiKeySid !== undefined) {
    payload.api_key_sid_encrypted = input.apiKeySid ? encryptToken(input.apiKeySid) : null;
  }
  if (input.apiKeySecret !== undefined) {
    payload.api_key_secret_encrypted = input.apiKeySecret ? encryptToken(input.apiKeySecret) : null;
  }
  if (input.metadata) payload.metadata = input.metadata;

  if (existing) {
    const { data, error } = await supabase
      .from("telephony_settings")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`telephony_settings update failed: ${error.message}`);
    return data as TelephonySettingsRow;
  }

  const { data, error } = await supabase
    .from("telephony_settings")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`telephony_settings insert failed: ${error.message}`);
  return data as TelephonySettingsRow;
}

export async function setTelephonyConnectedFlag(
  teamId: string,
  isConnected: boolean,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("telephony_settings")
    .update({
      is_connected: isConnected,
      last_verified_at: isConnected ? new Date().toISOString() : null,
    })
    .eq("team_id", teamId);
}

export async function deleteTelephonySettings(teamId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("telephony_settings").delete().eq("team_id", teamId);
}

/**
 * Light masking for UI — hides everything but the first 4 / last 4
 * characters of the auth token preview.
 */
export function maskEncrypted(value: string | null): string | null {
  if (!value) return null;
  try {
    const decoded = decryptToken(value);
    if (decoded.length <= 8) return "••••";
    return `${decoded.slice(0, 4)}...${decoded.slice(-4)}`;
  } catch {
    return null;
  }
}
