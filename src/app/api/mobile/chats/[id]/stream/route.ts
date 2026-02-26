import { NextRequest } from "next/server";
import { verifyToken } from "@clerk/backend";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/mobile/chats/[id]/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time chat message updates.
 * Mobile clients connect here to receive instant notifications when:
 * - New messages arrive (from desktop or web)
 * - Messages are updated
 *
 * Authentication: Uses Clerk JWT from Authorization header
 *
 * Events:
 * - connected: Initial connection confirmed
 * - message:new: New message in the chat
 * - ping: Keepalive (every 15 seconds)
 */

// Keepalive interval (15 seconds)
const PING_INTERVAL_MS = 15 * 1000;

// Poll for new messages every 2 seconds
const MESSAGE_POLL_INTERVAL_MS = 2 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  // Verify Clerk JWT from Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.split(" ")[1] ?? "";
  let clerkUserId: string;

  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    clerkUserId = verified.sub;
  } catch (verifyError) {
    logger.error("MobileStream", "Token verification failed", verifyError);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createSupabaseAdmin();

  // Get account and verify chat ownership
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
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
            logger.error("MobileStream", "Message poll error", error);
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
          logger.error("MobileStream", "Message poll exception", err);
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
