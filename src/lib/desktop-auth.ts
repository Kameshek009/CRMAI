/**
 * Desktop Authentication Utilities
 *
 * Handles token generation, validation, and management for the desktop app.
 * Implements the "Auth Once" pattern with refresh tokens.
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createSupabaseAdmin } from "./supabase/server";
import { logger } from "./logger";

// Configuration
// Validate JWT secret: prefer DESKTOP_JWT_SECRET, fall back to CLERK_SECRET_KEY
const DESKTOP_SECRET = process.env.DESKTOP_JWT_SECRET;
const CLERK_SECRET = process.env.CLERK_SECRET_KEY;

if (!DESKTOP_SECRET) {
  logger.warn("DesktopAuth", "DESKTOP_JWT_SECRET not set, falling back to CLERK_SECRET_KEY");
}

const JWT_SECRET: string = DESKTOP_SECRET || CLERK_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("No JWT secret configured (DESKTOP_JWT_SECRET or CLERK_SECRET_KEY) — cannot start");
}
const ACCESS_TOKEN_EXPIRY = parseInt(process.env.DESKTOP_TOKEN_EXPIRY || "3600"); // 1 hour default
const REFRESH_TOKEN_EXPIRY_DAYS = 365; // 1 year
const AUTH_CODE_EXPIRY_MINUTES = 5;

// Token prefixes for identification
const REFRESH_TOKEN_PREFIX = "drt_"; // Desktop Refresh Token
const AUTH_CODE_PREFIX = "dac_"; // Desktop Auth Code

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(prefix: string, length: number = 32): string {
  return prefix + crypto.randomBytes(length).toString("base64url");
}

/**
 * Generate a one-time authorization code
 * This code is exchanged for access + refresh tokens
 */
export async function generateAuthCode(
  clerkUserId: string,
  state: string,
  deviceName?: string,
  deviceId?: string
): Promise<string> {
  const code = generateSecureToken(AUTH_CODE_PREFIX, 32);
  const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRY_MINUTES * 60 * 1000);

  const supabase = createSupabaseAdmin();

  // Store the auth code
  const { error } = await supabase.from("desktop_auth_codes").insert({
    code,
    clerk_user_id: clerkUserId,
    state,
    device_name: deviceName,
    device_id: deviceId,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    logger.error("DesktopAuth", "Failed to store auth code", error);
    throw new Error("Failed to generate authorization code");
  }

  return code;
}

/**
 * Validate and consume an authorization code
 * Returns the associated user info if valid
 */
export async function validateAuthCode(
  code: string
): Promise<{ clerkUserId: string; deviceName?: string; deviceId?: string } | null> {
  const supabase = createSupabaseAdmin();

  // Atomically mark as used and return the auth code in one operation
  // This prevents race conditions where two requests could validate the same code
  const { data: authCode, error } = await supabase
    .from("desktop_auth_codes")
    .update({ used: true })
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select()
    .single();

  if (error || !authCode) {
    logger.info("DesktopAuth", "Auth code invalid/expired/used", error?.message);
    return null;
  }

  return {
    clerkUserId: authCode.clerk_user_id,
    deviceName: authCode.device_name,
    deviceId: authCode.device_id,
  };
}

/**
 * Generate access and refresh tokens for a desktop session
 */
export async function generateDesktopTokens(
  clerkUserId: string,
  accountId: string,
  billing: {
    tier: string;
    token_limit: number;
    tokens_used: number;
  },
  deviceName?: string,
  deviceId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  sessionId: string;
}> {
  const supabase = createSupabaseAdmin();

  // Generate refresh token
  const refreshToken = generateSecureToken(REFRESH_TOKEN_PREFIX, 48);

  // Calculate expiry (null = never expires, or set to 90 days)
  const expiresAt = REFRESH_TOKEN_EXPIRY_DAYS > 0
    ? new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    : null;

  // If device_id is provided, revoke any existing session for this device
  if (deviceId) {
    await supabase
      .from("desktop_sessions")
      .update({ revoked: true })
      .eq("account_id", accountId)
      .eq("device_id", deviceId)
      .eq("revoked", false);
  }

  // Create desktop session
  const { data: session, error } = await supabase
    .from("desktop_sessions")
    .insert({
      account_id: accountId,
      refresh_token: refreshToken,
      device_name: deviceName,
      device_id: deviceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select()
    .single();

  if (error || !session) {
    logger.error("DesktopAuth", "Failed to create session", error);
    throw new Error("Failed to create session");
  }

  // Generate access token (JWT)
  const accessTokenExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000);
  const accessToken = jwt.sign(
    {
      sub: clerkUserId,
      account_id: accountId,
      session_id: session.id,
      tier: billing.tier,
      token_limit: billing.token_limit,
      tokens_used: billing.tokens_used,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: "nexxus-dashboard",
      audience: "nexxus-desktop",
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresAt: accessTokenExpiry.toISOString(),
    sessionId: session.id,
  };
}

/**
 * Validate a refresh token and generate new access token
 */
export async function refreshDesktopToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresAt: string;
  account: {
    id: string;
    tier: string;
    token_limit: number;
    tokens_used: number;
    billing_cycle_start: string;
  };
} | null> {
  const supabase = createSupabaseAdmin();

  // Find the session
  const { data: session, error: sessionError } = await supabase
    .from("desktop_sessions")
    .select("*, accounts(*)")
    .eq("refresh_token", refreshToken)
    .eq("revoked", false)
    .single();

  if (sessionError || !session) {
    logger.info("DesktopAuth", "Session not found or revoked", sessionError?.message);
    return null;
  }

  // Check if session is expired
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    logger.info("DesktopAuth", "Session expired");
    // Mark as revoked
    await supabase.from("desktop_sessions").update({ revoked: true }).eq("id", session.id);
    return null;
  }

  const account = session.accounts as {
    id: string;
    clerk_user_id: string;
    current_team_id: string;
    billing_cycle_start: string;
  };

  // Get team billing data
  const { data: team } = await supabase
    .from("teams")
    .select("tier, token_limit, tokens_used")
    .eq("id", account.current_team_id)
    .single();

  const tier = team?.tier || "free";
  const tokenLimit = team?.token_limit || 0;
  const tokensUsed = team?.tokens_used || 0;

  // Update last_used_at
  await supabase
    .from("desktop_sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", session.id);

  // Generate new access token with team billing data
  const accessTokenExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000);
  const accessToken = jwt.sign(
    {
      sub: account.clerk_user_id,
      account_id: account.id,
      session_id: session.id,
      tier,
      token_limit: tokenLimit,
      tokens_used: tokensUsed,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: "nexxus-dashboard",
      audience: "nexxus-desktop",
    }
  );

  return {
    accessToken,
    expiresAt: accessTokenExpiry.toISOString(),
    account: {
      id: account.id,
      tier,
      token_limit: tokenLimit,
      tokens_used: tokensUsed,
      billing_cycle_start: account.billing_cycle_start,
    },
  };
}

/**
 * Revoke a refresh token (logout)
 */
export async function revokeRefreshToken(refreshToken: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("desktop_sessions")
    .update({ revoked: true })
    .eq("refresh_token", refreshToken);

  if (error) {
    logger.error("DesktopAuth", "Failed to revoke token", error);
    return false;
  }

  return true;
}

/**
 * Validate an access token (JWT)
 * Returns the decoded payload if valid
 */
export function validateAccessToken(accessToken: string): {
  sub: string;
  account_id: string;
  session_id: string;
  tier: string;
  token_limit: number;
  tokens_used: number;
} | null {
  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET, {
      issuer: "nexxus-dashboard",
      audience: "nexxus-desktop",
    }) as {
      sub: string;
      account_id: string;
      session_id: string;
      tier: string;
      token_limit: number;
      tokens_used: number;
    };

    return decoded;
  } catch (error) {
    logger.info("DesktopAuth", "Token validation failed", (error as Error).message);
    return null;
  }
}

/**
 * Get or create account for a Clerk user, with team billing data
 */
export async function getOrCreateAccount(clerkUserId: string): Promise<{
  id: string;
  current_team_id: string;
  tier: string;
  token_limit: number;
  tokens_used: number;
  billing_cycle_start: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}> {
  const supabase = createSupabaseAdmin();

  // Try to get existing account
  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (account) {
    // Enrich with team billing data
    if (account.current_team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("tier, token_limit, tokens_used")
        .eq("id", account.current_team_id)
        .single();

      if (team) {
        return {
          ...account,
          tier: team.tier,
          token_limit: team.token_limit,
          tokens_used: team.tokens_used,
        };
      }
    }
    return account;
  }

  // Create new account
  const { data: newAccount, error: createError } = await supabase
    .from("accounts")
    .insert({
      clerk_user_id: clerkUserId,
      tier: "free",
      token_limit: 50000,
      tokens_used: 0,
      billing_cycle_start: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError || !newAccount) {
    logger.error("DesktopAuth", "Failed to create account", createError);
    throw new Error("Failed to create account");
  }

  return newAccount;
}
