import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/agent/status
 *
 * Returns the desktop agent status for the current user.
 * Used by mobile and dashboard to check if agent is online.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get account by clerk_user_id
    const { data: account, error } = await supabase
      .from("accounts")
      .select("id, desktop_agent_online, desktop_agent_mode, desktop_agent_last_seen, desktop_agent_version")
      .eq("clerk_user_id", userId)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Check if agent is actually online (last seen within 2 minutes)
    let isOnline = account.desktop_agent_online;
    if (isOnline && account.desktop_agent_last_seen) {
      const lastSeen = new Date(account.desktop_agent_last_seen);
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      if (lastSeen < twoMinutesAgo) {
        isOnline = false;
        // Update the database to reflect offline status
        await supabase
          .from("accounts")
          .update({ desktop_agent_online: false })
          .eq("id", account.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        online: isOnline,
        mode: account.desktop_agent_mode || "chat",
        lastSeen: account.desktop_agent_last_seen,
        version: account.desktop_agent_version,
      },
    });
  } catch (error) {
    logger.error("AgentStatus","[agent/status] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get agent status" },
      { status: 500 }
    );
  }
}
