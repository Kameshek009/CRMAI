import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/chats/[id]/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time chat message updates.
 * Dashboard clients connect here to receive instant notifications when:
 * - New messages arrive (from desktop or mobile)
 * - Messages are updated
 *
 * Authentication: Uses Clerk auth (dashboard session)
 *
 * Events:
 * - connected: Initial connection confirmed
 * - message:new: New message in the chat
 * - message:updated: Message was updated
 * - ping: Keepalive (every 15 seconds)
 */

// Keepalive interval (15 seconds)
const PING_INTERVAL_MS = 15 * 1000;

// Poll for new messages every 2 seconds (fast enough for real-time feel)
const MESSAGE_POLL_INTERVAL_MS = 2 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  // Authenticate with Clerk
  const { userId } = await auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createSupabaseAdmin();

  // Get account and verify chat ownership
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (accountError || !account) {
    return new Response(JSON.stringify({ error: "Account not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify chat belongs to this account
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("account_id", account.id)
    .single();

  if (chatError || !chat) {
    return new Response(JSON.stringify({ error: "Chat not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Track last message timestamp for polling
  let lastMessageTimestamp: string | null = null;

  // Get initial last message timestamp
  const { data: latestMessage } = await supabase
    .from("messages")
    .select("created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latestMessage) {
    lastMessageTimestamp = latestMessage.created_at;
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let isConnected = true;
  let pingInterval: NodeJS.Timeout | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

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
       * Poll for new messages
       */
      const pollMessages = async () => {
        if (!isConnected) return;

        try {
          // Query for messages newer than last seen
          let query = supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

          if (lastMessageTimestamp) {
            query = query.gt("created_at", lastMessageTimestamp);
          }

          const { data: newMessages, error } = await query;

          if (error) {
            console.error("[SSE] Message poll error:", error);
            return;
          }

          if (newMessages && newMessages.length > 0) {
            // Send each new message
            for (const message of newMessages) {
              sendEvent("message:new", message);
              // Update last seen timestamp
              if (!lastMessageTimestamp || message.created_at > lastMessageTimestamp) {
                lastMessageTimestamp = message.created_at;
              }
            }
          }
        } catch (err) {
          console.error("[SSE] Message poll exception:", err);
        }
      };

      // Send connected event
      sendEvent("connected", {
        chatId,
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

      // Start message polling
      pollInterval = setInterval(pollMessages, MESSAGE_POLL_INTERVAL_MS);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isConnected = false;
        if (pingInterval) clearInterval(pingInterval);
        if (pollInterval) clearInterval(pollInterval);
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
      if (pollInterval) clearInterval(pollInterval);
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
