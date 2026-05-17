/**
 * DB-side helpers for the `oauth_tokens` table. All callers go through here
 * so encryption/decryption stays in one place and tests can mock a single
 * surface.
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/api-auth/token-crypto";
import { refreshAccessToken, expiresInToTimestamp } from "./google";

export type OAuthProvider =
  | "google"
  | "microsoft"
  | "hubspot"
  | "amocrm"
  | "bitrix24"
  | "salesforce";

export interface OAuthConnectionRow {
  id: string;
  team_id: string;
  account_id: string;
  provider: OAuthProvider;
  provider_user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
}

export interface UpsertTokenInput {
  teamId: string;
  accountId: string;
  provider: OAuthProvider;
  providerUserId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: string | null;
  scopes: string[];
  metadata?: Record<string, unknown>;
}

/**
 * INSERT or UPDATE the (team, provider, provider_user_id) row. We always
 * encrypt `access_token` and `refresh_token` before writing.
 *
 * Refresh token policy: only overwrite when caller provides a non-null value.
 * Google omits `refresh_token` on subsequent consent grants if the previous
 * grant already had one — overwriting with null would break refresh forever.
 */
export async function upsertOAuthTokens(input: UpsertTokenInput): Promise<OAuthConnectionRow> {
  const supabase = createSupabaseAdmin();
  const accessEnc = encryptToken(input.accessToken);
  const refreshEnc = input.refreshToken ? encryptToken(input.refreshToken) : null;

  const existing = await supabase
    .from("oauth_tokens")
    .select("id, refresh_token_encrypted")
    .eq("team_id", input.teamId)
    .eq("provider", input.provider)
    .eq("provider_user_id", input.providerUserId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    team_id: input.teamId,
    account_id: input.accountId,
    provider: input.provider,
    provider_user_id: input.providerUserId,
    access_token_encrypted: accessEnc,
    expires_at: input.expiresAt,
    scopes: input.scopes,
    metadata: input.metadata ?? {},
  };
  if (refreshEnc) {
    payload.refresh_token_encrypted = refreshEnc;
  } else if (!existing.data?.refresh_token_encrypted) {
    payload.refresh_token_encrypted = null;
  }

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from("oauth_tokens")
      .update(payload)
      .eq("id", existing.data.id)
      .select("*")
      .single();
    if (error) throw new Error(`oauth_tokens update failed: ${error.message}`);
    return data as OAuthConnectionRow;
  }

  const { data, error } = await supabase
    .from("oauth_tokens")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`oauth_tokens insert failed: ${error.message}`);
  return data as OAuthConnectionRow;
}

export async function listOAuthConnections(teamId: string): Promise<OAuthConnectionRow[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw new Error(`oauth_tokens list failed: ${error.message}`);
  return (data ?? []) as OAuthConnectionRow[];
}

export async function getOAuthConnection(
  teamId: string,
  provider: OAuthProvider,
): Promise<OAuthConnectionRow | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("team_id", teamId)
    .eq("provider", provider)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`oauth_tokens fetch failed: ${error.message}`);
  return (data as OAuthConnectionRow) ?? null;
}

export async function deleteOAuthConnection(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("oauth_tokens").delete().eq("id", id);
  if (error) throw new Error(`oauth_tokens delete failed: ${error.message}`);
}

/**
 * Decrypt the stored access token and refresh it on demand. Returns a plain
 * access_token the caller can use immediately. If refresh fails (e.g. user
 * revoked access on Google's side), the connection row stays but caller
 * gets an error and should mark it disconnected.
 *
 * Refresh-on-write: when we get a new access token we persist the new
 * expires_at so concurrent callers reuse it.
 */
export async function getValidAccessToken(
  row: OAuthConnectionRow,
  options?: { skewSeconds?: number },
): Promise<string> {
  const skew = options?.skewSeconds ?? 60;
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillValid = expiresAt > Date.now() + skew * 1000;
  if (stillValid) {
    return decryptToken(row.access_token_encrypted);
  }

  if (!row.refresh_token_encrypted) {
    throw new Error("oauth_tokens row has no refresh_token; reconnect required");
  }
  const refreshToken = decryptToken(row.refresh_token_encrypted);
  const refreshed = await refreshAccessToken(refreshToken);

  const supabase = createSupabaseAdmin();
  const newExpires = expiresInToTimestamp(refreshed.expiresIn);
  await supabase
    .from("oauth_tokens")
    .update({
      access_token_encrypted: encryptToken(refreshed.accessToken),
      expires_at: newExpires,
    })
    .eq("id", row.id);
  return refreshed.accessToken;
}
