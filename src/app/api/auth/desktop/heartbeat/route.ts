import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/desktop/heartbeat
 *
 * LEGACY/FALLBACK heartbeat endpoint for session management only.
 *
 * NOTE: The consolidated heartbeat endpoint is /api/desktop/heartbeat
 * which updates BOTH session and account tables. This endpoint is kept
 * for backwards compatibility but only updates desktop_sessions.
 *
 * For agent status display, use /api/desktop/heartbeat instead.
 *
 * Headers:
 *   Authorization: Bearer {accessToken}
 *
 * Response:
 * {
 *   success: true,
 *   data: { last_used_at: "..." }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    // Validate access token
    const tokenData = validateAccessToken(accessToken);

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired access token" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();

    // Update desktop_sessions.last_used_at (for session management)
    // NOTE: Account status is now updated by /api/desktop/heartbeat
    const { error: sessionError } = await supabase
      .from("desktop_sessions")
      .update({ last_used_at: now })
      .eq("id", tokenData.session_id)
      .eq("revoked", false);

    if (sessionError) {
      logger.error("DesktopAuthHeartbeat", "Session update error", sessionError);
      return NextResponse.json(
        { success: false, error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { last_used_at: now },
    });
  } catch (error) {
    logger.error("DesktopAuthHeartbeat", "Heartbeat error", error);
    return NextResponse.json(
      { success: false, error: "Heartbeat failed" },
      { status: 500 }
    );
  }
}
