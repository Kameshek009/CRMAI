import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/auth/mobile";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/mobile/chats/[id]/messages
 *
 * Fetch all messages for a specific chat.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;

    // Verify mobile auth
    const auth = await verifyMobileAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabase = createSupabaseAdmin();

    // Verify chat belongs to account
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", auth.accountId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // Pagination & polling params
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);

    // Fetch messages — polling mode (since) and pagination mode (offset) are mutually exclusive
    let query = supabase
      .from("messages")
      .select("id, chat_id, role, content, message_type, metadata, created_at, local_id, device_origin")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (since) {
      // Polling mode: get new messages after timestamp, limit to prevent huge responses
      query = query.gt("created_at", since).limit(limit);
    } else {
      // Pagination mode: offset-based
      query = query.range(offset, offset + limit - 1);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    });
  } catch (error) {
    logger.error("MobileMessages", "GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/chats/[id]/messages
 *
 * Send a new message in a chat.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;

    // Verify mobile auth
    const auth = await verifyMobileAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const {
      role,
      content,
      metadata,
      message_type = "text",
      local_id,
      device_origin = "mobile",
    } = body;

    if (!role || !content) {
      return NextResponse.json(
        { success: false, error: "role and content are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Verify chat belongs to account
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", auth.accountId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // Create message
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role,
        content,
        metadata: metadata || {},
        message_type,
        local_id,
        device_origin,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Update chat's updated_at
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    logger.error("MobileMessages", "POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
