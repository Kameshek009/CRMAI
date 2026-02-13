import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * POST /api/desktop/heartbeat
 *
 * CONSOLIDATED heartbeat endpoint for desktop agent.
 * Updates BOTH:
 * - accounts.desktop_agent_* (for agent status display on dashboard)
 * - desktop_sessions.last_used_at (for session management)
 *
 * This is now the SINGLE source of truth for agent online status.
 * Both dashboard-auth-service and cloud-sync-service should use this endpoint.
 *
 * Body:
 * {
 *   mode: "chat" | "agent" | "auto",
 *   version?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const tokenData = validateAccessToken(accessToken);

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired access token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mode, version } = body;

    // Validate mode
    const validModes = ["chat", "agent", "auto"];
    if (mode && !validModes.includes(mode)) {
      return NextResponse.json(
        { success: false, error: "Invalid mode. Must be: chat, agent, or auto" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();

    // 1. Update account with heartbeat (agent status for dashboard)
    const { data, error } = await supabase
      .from("accounts")
      .update({
        desktop_agent_online: true,
        desktop_agent_mode: mode || "chat",
        desktop_agent_last_seen: now,
        desktop_agent_version: version || null,
      })
      .eq("id", tokenData.account_id)
      .select("id, desktop_agent_online, desktop_agent_mode, desktop_agent_last_seen")
      .single();

    if (error) {
      console.error("[desktop/heartbeat] accounts error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update heartbeat" },
        { status: 500 }
      );
    }

    // 2. Update desktop_sessions.last_used_at (for session management)
    // This keeps the session alive and tracks activity
    if (tokenData.session_id) {
      const { error: sessionError } = await supabase
        .from("desktop_sessions")
        .update({ last_used_at: now })
        .eq("id", tokenData.session_id)
        .eq("revoked", false);

      if (sessionError) {
        // Log but don't fail - account update is more important for agent status
        console.warn("[desktop/heartbeat] session update warning:", sessionError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        online: data.desktop_agent_online,
        mode: data.desktop_agent_mode,
        lastSeen: data.desktop_agent_last_seen,
      },
    });
  } catch (error) {
    console.error("[desktop/heartbeat] error:", error);
    return NextResponse.json(
      { success: false, error: "Heartbeat failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/desktop/heartbeat
 *
 * Desktop agent explicitly marks itself as offline (on app quit).
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const tokenData = validateAccessToken(accessToken);

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired access token" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Mark agent as offline
    const { error } = await supabase
      .from("accounts")
      .update({
        desktop_agent_online: false,
      })
      .eq("id", tokenData.account_id);

    if (error) {
      console.error("[desktop/heartbeat] DELETE error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to mark offline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[desktop/heartbeat] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark offline" },
      { status: 500 }
    );
  }
}
