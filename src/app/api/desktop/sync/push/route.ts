import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * POST /api/desktop/sync/push
 *
 * Generic push endpoint for syncing entities from desktop to cloud.
 * Handles chats, messages, and other sync operations.
 *
 * Body:
 * {
 *   action: "create" | "update" | "delete",
 *   type: "chat" | "message",
 *   data: {...}
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
    const { action, type, data } = body;

    if (!action || !type || !data) {
      return NextResponse.json(
        { success: false, error: "action, type, and data are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Handle different entity types
    switch (type) {
      case "chat":
        return await handleChatSync(supabase, tokenData.account_id, action, data);

      case "message":
        return await handleMessageSync(supabase, tokenData.account_id, action, data);

      default:
        return NextResponse.json(
          { success: false, error: `Unknown entity type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[desktop/sync/push] error:", error);
    return NextResponse.json(
      { success: false, error: "Sync push failed" },
      { status: 500 }
    );
  }
}

async function handleChatSync(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  accountId: string,
  action: string,
  data: Record<string, unknown>
) {
  const chatId = data.id as string;

  switch (action) {
    case "create": {
      // Check if already exists
      if (chatId) {
        const { data: existing } = await supabase
          .from("chats")
          .select("id")
          .eq("id", chatId)
          .single();

        if (existing) {
          // Update instead
          const { data: chat, error } = await supabase
            .from("chats")
            .update({
              title: data.title,
              mode: data.mode,
              device_origin: data.device_origin,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", chatId)
            .select()
            .single();

          if (error) throw error;
          return NextResponse.json({ success: true, data: chat, action: "updated" });
        }
      }

      // Create new
      const { data: chat, error } = await supabase
        .from("chats")
        .insert({
          id: chatId || undefined,
          account_id: accountId,
          title: data.title as string | null,
          mode: (data.mode as string) || "chat",
          device_origin: data.device_origin as string | undefined,
          is_deleted: false,
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      console.log("[desktop/sync/push] Created chat:", chat.id);
      return NextResponse.json({ success: true, data: chat, action: "created" });
    }

    case "update": {
      if (!chatId) {
        return NextResponse.json(
          { success: false, error: "Chat ID required for update" },
          { status: 400 }
        );
      }

      // Verify ownership
      const { data: existing } = await supabase
        .from("chats")
        .select("id, account_id")
        .eq("id", chatId)
        .single();

      if (!existing || existing.account_id !== accountId) {
        return NextResponse.json(
          { success: false, error: "Chat not found or access denied" },
          { status: 404 }
        );
      }

      const { data: chat, error } = await supabase
        .from("chats")
        .update({
          title: data.title,
          mode: data.mode,
          device_origin: data.device_origin,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", chatId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: chat, action: "updated" });
    }

    case "delete": {
      if (!chatId) {
        return NextResponse.json(
          { success: false, error: "Chat ID required for delete" },
          { status: 400 }
        );
      }

      // Verify ownership
      const { data: existing } = await supabase
        .from("chats")
        .select("id, account_id")
        .eq("id", chatId)
        .single();

      if (!existing || existing.account_id !== accountId) {
        return NextResponse.json(
          { success: false, error: "Chat not found or access denied" },
          { status: 404 }
        );
      }

      // Soft delete
      const { error } = await supabase
        .from("chats")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", chatId);

      if (error) throw error;
      console.log("[desktop/sync/push] Deleted chat:", chatId);
      return NextResponse.json({ success: true, action: "deleted" });
    }

    default:
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}

async function handleMessageSync(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  accountId: string,
  action: string,
  data: Record<string, unknown>
) {
  const messageId = data.id as string;
  const chatId = data.chat_id as string;

  if (!chatId) {
    return NextResponse.json(
      { success: false, error: "chat_id is required" },
      { status: 400 }
    );
  }

  // Verify chat ownership
  const { data: chat } = await supabase
    .from("chats")
    .select("id, account_id")
    .eq("id", chatId)
    .single();

  if (!chat || chat.account_id !== accountId) {
    return NextResponse.json(
      { success: false, error: "Chat not found or access denied" },
      { status: 404 }
    );
  }

  switch (action) {
    case "create": {
      // Check for duplicate by local_id
      const localId = data.local_id as string | undefined;
      if (localId) {
        const { data: existing } = await supabase
          .from("messages")
          .select("*")
          .eq("local_id", localId)
          .eq("chat_id", chatId)
          .single();

        if (existing) {
          return NextResponse.json({
            success: true,
            data: existing,
            action: "existing",
          });
        }
      }

      // Also check by ID if provided
      if (messageId) {
        const { data: existing } = await supabase
          .from("messages")
          .select("*")
          .eq("id", messageId)
          .single();

        if (existing) {
          return NextResponse.json({
            success: true,
            data: existing,
            action: "existing",
          });
        }
      }

      // Create new message - preserve original created_at if provided
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          id: messageId || undefined,
          chat_id: chatId,
          role: data.role as string,
          content: data.content as string,
          metadata: (data.metadata as Record<string, unknown>) || {},
          message_type: (data.message_type as string) || "text",
          tokens_used: (data.tokens_used as number) || 0,
          local_id: localId,
          device_origin: data.device_origin as string | undefined,
          // Preserve original timestamp from desktop to maintain message order
          created_at: data.created_at as string | undefined,
        })
        .select()
        .single();

      if (error) throw error;

      // Update chat's updated_at
      await supabase
        .from("chats")
        .update({
          updated_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", chatId);

      return NextResponse.json({ success: true, data: message, action: "created" });
    }

    default:
      return NextResponse.json(
        { success: false, error: `Action ${action} not supported for messages` },
        { status: 400 }
      );
  }
}
