/**
 * Server-Sent Events (SSE) Endpoint for Real-time Sync
 *
 * This endpoint provides push-based real-time updates to desktop clients.
 * Instead of polling, clients maintain a single long-lived HTTP connection
 * and receive instant updates when data changes in Supabase.
 *
 * Protocol:
 * - Client connects with GET request + Bearer token
 * - Server validates JWT, subscribes to Supabase Realtime
 * - Server pushes events when account data changes
 * - Heartbeat every 30s keeps connection alive
 *
 * Events:
 * - connected: Initial connection confirmed
 * - account-updated: Account data changed (tokens_used, tier, etc.)
 * - heartbeat: Keep-alive signal
 * - error: Error occurred
 */

import { NextRequest } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

/**
 * GET /api/sync/stream
 *
 * Establishes an SSE connection for real-time account updates.
 * Requires Bearer token authentication.
 */
export async function GET(request: NextRequest) {
  // Extract and validate Bearer token
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, error: "Authorization header required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const accessToken = authHeader.substring(7);
  const tokenData = validateAccessToken(accessToken);

  if (!tokenData) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid or expired access token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { account_id, session_id, sub: clerkUserId } = tokenData;

  logger.info("Sync",`[SSE] New connection: account=${account_id}, session=${session_id}`);

  // Verify session is still valid
  const supabase = createSupabaseAdmin();
  const { data: session, error: sessionError } = await supabase
    .from("desktop_sessions")
    .select("*")
    .eq("id", session_id)
    .eq("revoked", false)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ success: false, error: "Session revoked or expired" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let channel: RealtimeChannel | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isConnected = true;

  const stream = new ReadableStream({
    start(controller) {
      /**
       * Send an SSE event to the client
       */
      const sendEvent = (event: string, data: unknown) => {
        if (!isConnected) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          logger.error("Sync",`[SSE] Failed to send event ${event}:`, error);
        }
      };

      /**
       * Send a comment (for heartbeat)
       */
      const sendComment = (comment: string) => {
        if (!isConnected) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch (error) {
          logger.error("Sync","[SSE] Failed to send comment:", error);
        }
      };

      // Send initial connected event with current team billing data
      supabase
        .from("accounts")
        .select("current_team_id")
        .eq("id", account_id)
        .single()
        .then(async ({ data: acc, error: accErr }) => {
          if (accErr || !acc?.current_team_id) {
            sendEvent("error", { message: "Account not found" });
            return;
          }

          const teamId = acc.current_team_id;

          const { data: team, error: teamErr } = await supabase
            .from("teams")
            .select("id, tier, token_limit, tokens_used")
            .eq("id", teamId)
            .single();

          if (teamErr || !team) {
            sendEvent("error", { message: "Team not found" });
            return;
          }

          sendEvent("connected", {
            status: "ok",
            account: {
              id: account_id,
              tier: team.tier,
              token_limit: team.token_limit,
              tokens_used: team.tokens_used,
            },
          });

          // Subscribe to Supabase Realtime for team billing changes
          channel = supabase
            .channel(`desktop-sync:${account_id}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "teams",
                filter: `id=eq.${teamId}`,
              },
              (payload) => {
                logger.info("Sync",`[SSE] Team updated: ${teamId}`);

                if (payload.new) {
                  const updatedTeam = payload.new as {
                    id: string;
                    tier: string;
                    token_limit: number;
                    tokens_used: number;
                  };

                  sendEvent("account-updated", {
                    id: account_id,
                    tier: updatedTeam.tier,
                    token_limit: updatedTeam.token_limit,
                    tokens_used: updatedTeam.tokens_used,
                  });
                }
              }
            )
            .subscribe((status) => {
              logger.info("Sync",`[SSE] Realtime subscription status: ${status}`);
              if (status === "SUBSCRIBED") {
                logger.info("Sync",`[SSE] Successfully subscribed to team ${teamId}`);
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                sendEvent("error", { message: "Realtime subscription failed" });
              }
            });
        });

      // Start heartbeat interval
      heartbeatInterval = setInterval(() => {
        sendComment(`heartbeat ${new Date().toISOString()}`);
      }, HEARTBEAT_INTERVAL_MS);

      logger.info("Sync",`[SSE] Stream started for account ${account_id}`);
    },

    cancel() {
      // Cleanup on disconnect
      isConnected = false;
      logger.info("Sync",`[SSE] Stream cancelled for account ${account_id}`);

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

/**
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.DESKTOP_APP_ORIGIN || "tauri://localhost",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
