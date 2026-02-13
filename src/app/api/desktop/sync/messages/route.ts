import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/desktop/sync/messages
 *
 * Get messages for a chat.
 * Query params:
 *   - chat_id: (required) the chat to get messages for
 *   - since: (optional) ISO date to get messages created after this time
 *   - limit: (optional) max number of messages to return
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chat_id");
    const since = searchParams.get("since");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: "chat_id is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Verify chat belongs to account
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id, account_id")
      .eq("id", chatId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    if (chat.account_id !== tokenData.account_id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get messages
    let query = supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (since) {
      query = query.gte("created_at", since);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (error) {
    console.error("[desktop/sync/messages] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/desktop/sync/messages
 *
 * Create a new message.
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
    const {
      id,
      chat_id,
      role,
      content,
      metadata,
      message_type,
      tokens_used,
      local_id,
      device_origin,
    } = body;

    if (!chat_id || !role || !content) {
      return NextResponse.json(
        { success: false, error: "chat_id, role, and content are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Verify chat belongs to account
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id, account_id")
      .eq("id", chat_id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    if (chat.account_id !== tokenData.account_id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Check for duplicate by local_id to prevent duplicates during sync
    if (local_id) {
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("local_id", local_id)
        .eq("chat_id", chat_id)
        .single();

      if (existing) {
        // Return existing message instead of creating duplicate
        const { data: existingMessage } = await supabase
          .from("messages")
          .select("*")
          .eq("id", existing.id)
          .single();

        return NextResponse.json({
          success: true,
          message: existingMessage,
          action: "existing",
        });
      }
    }

    // Create message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        id: id || undefined,
        chat_id,
        role,
        content,
        metadata: metadata || {},
        message_type: message_type || "text",
        tokens_used: tokens_used || 0,
        local_id,
        device_origin,
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
      .eq("id", chat_id);

    return NextResponse.json({ success: true, message, action: "created" });
  } catch (error) {
    console.error("[desktop/sync/messages] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync message" },
      { status: 500 }
    );
  }
}
