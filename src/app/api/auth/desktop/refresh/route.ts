import { NextRequest, NextResponse } from "next/server";
import { refreshDesktopToken } from "@/lib/desktop-auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/desktop/refresh
 *
 * Exchange a refresh token for a new access token.
 * This enables silent token refresh without user interaction.
 *
 * Request body:
 * {
 *   refreshToken: string  // The refresh token from initial auth
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     accessToken: string,  // New JWT (1 hour)
 *     expiresAt: string,    // New expiry (ISO 8601)
 *     account: {...}        // Updated account info
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Validate and refresh
    const result = await refreshDesktopToken(refreshToken);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        account: result.account,
      },
    });
  } catch (error) {
    logger.error("DesktopAuthRefresh", "Token refresh error", error);
    return NextResponse.json(
      { success: false, error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
