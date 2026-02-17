import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/agent/status/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time agent status updates.
 * Dashboard clients connect here to receive instant notifications when:
 * - Desktop agent comes online/offline
 * - Agent mode changes (chat/agent/auto)
 *
 * Authentication: Uses Clerk auth (dashboard session)
 *
 * Events:
 * - connected: Initial connection with current status
 * - status: Agent status update
 * - ping: Keepalive (every 15 seconds)
 */

// Keepalive interval (15 seconds)
const PING_INTERVAL_MS = 15 * 1000;

// Check status interval (3 seconds) - more responsive than relying on Realtime
const STATUS_CHECK_INTERVAL_MS = 3 * 1000;

// Online threshold (2 minutes - same as API route)
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Authenticate with Clerk
  const { userId } = await auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createSupabaseAdmin();

  // Get account for this user
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, desktop_agent_online, desktop_agent_mode, desktop_agent_last_seen, desktop_agent_version")
    .eq("clerk_user_id", userId)
    .single();

  if (accountError || !account) {
    return new Response(JSON.stringify({ error: "Account not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accountId = account.id;

  // Create SSE stream
  const encoder = new TextEncoder();
  let isConnected = true;
  let pingInterval: NodeJS.Timeout | null = null;
  let statusCheckInterval: NodeJS.Timeout | null = null;
  let lastStatus: { online: boolean; mode: string; lastSeen: string | null; version: string | null } | null = null;

  const stream = new ReadableStream({
    start(controller) {
      /**
       * Send an SSE event
       */
      const sendEvent = (event: string, data: unknown) => {
        if (!isConnected) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream may be closed
        }
      };

      /**
       * Check and compute current status
       */
      const computeStatus = (data: {
        desktop_agent_online?: boolean;
        desktop_agent_mode?: string;
        desktop_agent_last_seen?: string;
        desktop_agent_version?: string;
      }) => {
        let isOnline = data.desktop_agent_online ?? false;

        // Double-check based on last_seen timestamp
        if (isOnline && data.desktop_agent_last_seen) {
          const lastSeen = new Date(data.desktop_agent_last_seen).getTime();
          const now = Date.now();
          if (now - lastSeen > ONLINE_THRESHOLD_MS) {
            isOnline = false;
          }
        }

        return {
          online: isOnline,
          mode: data.desktop_agent_mode || "chat",
          lastSeen: data.desktop_agent_last_seen || null,
          version: data.desktop_agent_version || null,
        };
      };

      /**
       * Fetch current status and send if changed
       */
      const checkAndSendStatus = async () => {
        if (!isConnected) return;

        try {
          const { data: currentAccount } = await supabase
            .from("accounts")
            .select("desktop_agent_online, desktop_agent_mode, desktop_agent_last_seen, desktop_agent_version")
            .eq("id", accountId)
            .single();

          if (currentAccount) {
            const newStatus = computeStatus(currentAccount);

            // Only send if status changed
            if (
              !lastStatus ||
              lastStatus.online !== newStatus.online ||
              lastStatus.mode !== newStatus.mode
            ) {
              lastStatus = newStatus;
              sendEvent("status", newStatus);
            }
          }
        } catch (err) {
          logger.error("AgentStatusStream", "Status check error", err);
        }
      };

      // Compute initial status
      const initialStatus = computeStatus(account);
      lastStatus = initialStatus;

      // Send connected event with initial status
      sendEvent("connected", {
        accountId,
        status: initialStatus,
        timestamp: new Date().toISOString(),
      });

      // Start ping interval
      pingInterval = setInterval(() => {
        if (!isConnected) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          // Stream closed
        }
      }, PING_INTERVAL_MS);

      // Start status check interval (polling is more reliable than Supabase Realtime for this use case)
      statusCheckInterval = setInterval(checkAndSendStatus, STATUS_CHECK_INTERVAL_MS);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isConnected = false;
        if (pingInterval) clearInterval(pingInterval);
        if (statusCheckInterval) clearInterval(statusCheckInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },

    cancel() {
      isConnected = false;
      if (pingInterval) clearInterval(pingInterval);
      if (statusCheckInterval) clearInterval(statusCheckInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
