import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import {
  validateAuthCode,
  generateDesktopTokens,
  getOrCreateAccount,
} from "@/lib/desktop-auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/desktop/token
 *
 * Exchange a one-time authorization code for access and refresh tokens.
 * This is called by the desktop app after the user completes browser auth.
 *
 * Request body:
 * {
 *   code: string,        // One-time auth code from /auth/desktop callback
 *   device_id?: string,  // Unique device identifier
 *   device_name?: string // Human-readable device name
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     accessToken: string,    // JWT for API requests (1 hour)
 *     refreshToken: string,   // For silent token refresh (90 days)
 *     expiresAt: string,      // Access token expiry (ISO 8601)
 *     user: {...},            // User info from Clerk
 *     account: {...}          // Account info (tier, limits, usage)
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, device_id, device_name } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Authorization code is required" },
        { status: 400 }
      );
    }

    // Validate the auth code
    const authCodeData = await validateAuthCode(code);

    if (!authCodeData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired authorization code" },
        { status: 401 }
      );
    }

    // Get or create account
    const account = await getOrCreateAccount(authCodeData.clerkUserId);

    // Get client info
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Generate tokens
    const { accessToken, refreshToken, expiresAt, sessionId } = await generateDesktopTokens(
      authCodeData.clerkUserId,
      account.id,
      {
        tier: account.tier,
        token_limit: account.token_limit,
        tokens_used: account.tokens_used,
      },
      device_name || authCodeData.deviceName,
      device_id || authCodeData.deviceId,
      ipAddress,
      userAgent
    );

    // Return tokens and user info
    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresAt,
        sessionId,
        user: {
          id: authCodeData.clerkUserId,
          // Note: Full user info would require Clerk Backend API call
          // For now, we return minimal info
        },
        account: {
          id: account.id,
          tier: account.tier,
          token_limit: account.token_limit,
          tokens_used: account.tokens_used,
          billing_cycle_start: account.billing_cycle_start,
        },
      },
    });
  } catch (error) {
    logger.error("DesktopAuthToken", "Token exchange error", error);
    return NextResponse.json(
      { success: false, error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
