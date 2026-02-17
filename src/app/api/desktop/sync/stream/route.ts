import { NextRequest } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/desktop/sync/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time sync.
 * Desktop connects and receives instant updates for:
 * - New messages in any of their chats
 * - Chat updates (title, mode changes)
 *
 * Authentication: Bearer token in Authorization header
 */
export async function GET(request: NextRequest) {
  // Validate authorization
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = authHeader.substring(7);
  const tokenData = validateAccessToken(accessToken);

  if (!tokenData) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accountId = tokenData.account_id;

  // Create SSE response stream
  const encoder = new TextEncoder();
  let supabaseChannel: ReturnType<ReturnType<typeof createSupabaseAdmin>["channel"]> | null = null;

  // Create supabase client outside stream for proper cleanup
  const supabase = createSupabaseAdmin();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const sendEvent = (event: string, data: unknown) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream may be closed
        }
      };

      // Send keepalive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          sendEvent("ping", { timestamp: new Date().toISOString() });
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Connection established
      sendEvent("connected", {
        account_id: accountId,
        timestamp: new Date().toISOString(),
      });

      supabaseChannel = supabase
        .channel(`desktop-sync:${accountId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            try {
              // Verify this message belongs to a chat owned by this account
              const message = payload.new;
              const chatId = message.chat_id;

              // Quick check - get the chat's account_id
              const { data: chat } = await supabase
                .from("chats")
                .select("account_id")
                .eq("id", chatId)
                .single();

              if (chat?.account_id === accountId) {
                // Only send if this message wasn't sent from desktop itself
                // (device_origin starting with 'desktop' means it came from desktop)
                if (!message.device_origin?.startsWith("desktop")) {
                  sendEvent("message:new", {
                    chat_id: chatId,
                    message: message,
                  });
                }
              }
            } catch (err) {
              logger.error("DesktopSyncStream", "Error processing message event", err);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chats",
            filter: `account_id=eq.${accountId}`,
          },
          (payload) => {
            const chat = payload.new;
            // Only send if update wasn't from desktop
            if (!chat.device_origin?.startsWith("desktop")) {
              sendEvent("chat:updated", {
                chat_id: chat.id,
                title: chat.title,
                mode: chat.mode,
                updated_at: chat.updated_at,
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            logger.info("DesktopSyncStream", `Subscribed to realtime for account ${accountId}`);
            sendEvent("subscribed", { status: "active" });
          } else if (status === "CHANNEL_ERROR") {
            logger.error("DesktopSyncStream", `Channel error for account ${accountId}`);
            sendEvent("error", { message: "Subscription error" });
          }
        });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        logger.info("DesktopSyncStream", `Client disconnected: ${accountId}`);
        clearInterval(pingInterval);
        if (supabaseChannel) {
          supabase.removeChannel(supabaseChannel);
        }
        controller.close();
      });
    },

    cancel() {
      // Cleanup when stream is cancelled - use existing supabase client
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
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
