import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/desktop-auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/desktop/revoke
 *
 * Revoke a refresh token (logout from desktop app).
 * The token will no longer be usable for refreshing.
 *
 * Request body:
 * {
 *   refreshToken: string  // The refresh token to revoke
 * }
 *
 * Response:
 * {
 *   success: true
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

    // Revoke the token
    const revoked = await revokeRefreshToken(refreshToken);

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: "Failed to revoke token" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error("DesktopAuthRevoke", "Token revoke error", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke token" },
      { status: 500 }
    );
  }
}
