import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { hashApiKey, isApiKeyShape } from "./generate-key";
import { hasAllScopes } from "./scopes";
import { logger } from "@/lib/logger";

export type BearerAuthFailure =
  | "missing_header"
  | "wrong_prefix"
  | "invalid_or_revoked"
  | "expired"
  | "insufficient_scope";

export interface BearerAuthSuccess {
  ok: true;
  keyId: string;
  teamId: string;
  accountId: string;
  scopes: string[];
}

export interface BearerAuthError {
  ok: false;
  reason: BearerAuthFailure;
  missing?: string[];
}

export type BearerAuthResult = BearerAuthSuccess | BearerAuthError;

function getClientIp(request: NextRequest | Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}

export async function verifyBearerToken(
  request: NextRequest | Request,
  options?: { requireScopes?: readonly string[] },
): Promise<BearerAuthResult> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, reason: "missing_header" };
  }

  const token = header.slice("Bearer ".length).trim();
  if (!isApiKeyShape(token)) {
    return { ok: false, reason: "wrong_prefix" };
  }

  const hash = hashApiKey(token);
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, team_id, account_id, scopes, expires_at")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    logger.error("BearerAuth", "DB error during key lookup", error);
    return { ok: false, reason: "invalid_or_revoked" };
  }
  if (!data) {
    return { ok: false, reason: "invalid_or_revoked" };
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const grantedScopes: string[] = Array.isArray(data.scopes) ? data.scopes : [];
  if (options?.requireScopes?.length) {
    if (!hasAllScopes(grantedScopes, options.requireScopes)) {
      return {
        ok: false,
        reason: "insufficient_scope",
        missing: options.requireScopes.filter((r) => !hasAllScopes(grantedScopes, [r])),
      };
    }
  }

  // Update last_used_at / last_used_ip async (fire-and-forget).
  const ip = getClientIp(request);
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), last_used_ip: ip })
    .eq("id", data.id);

  return {
    ok: true,
    keyId: data.id,
    teamId: data.team_id,
    accountId: data.account_id,
    scopes: grantedScopes,
  };
}
