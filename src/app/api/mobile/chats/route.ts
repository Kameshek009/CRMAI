import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/auth/mobile";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/mobile/chats
 *
 * List chats for a user.
 * Uses Clerk JWT validation for security.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify mobile auth
    const auth = await verifyMobileAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabase = createSupabaseAdmin();

    const { data: chats, error } = await supabase
      .from("chats")
      .select(`
        id,
        title,
        mode,
        updated_at,
        vision_board_id,
        messages (
          id,
          content,
          created_at
        )
      `)
      .eq("account_id", auth.accountId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      logger.error("MobileChats", "List error", error);
      return NextResponse.json(
        { error: "Failed to fetch chats" },
        { status: 500 }
      );
    }

    // Transform to include message count and preview
    const chatList = (chats || []).map((chat) => {
      const messages = chat.messages || [];
      const sortedMessages = messages.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastMessage = sortedMessages[0];

      return {
        id: chat.id,
        title: chat.title,
        mode: chat.mode,
        updated_at: chat.updated_at,
        message_count: messages.length,
        last_message_preview: lastMessage?.content?.slice(0, 100),
      };
    });

    return NextResponse.json({
      success: true,
      chats: chatList,
    });
  } catch (error) {
    logger.error("MobileChats", "GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/chats
 *
 * Create a new chat.
 * Uses Clerk JWT validation for security.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify mobile auth
    const auth = await verifyMobileAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const { mode = "chat", title, device_origin = "mobile" } = body;

    const supabase = createSupabaseAdmin();

    const { data: chat, error } = await supabase
      .from("chats")
      .insert({
        account_id: auth.accountId,
        mode,
        title,
        device_origin,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error("MobileChats", "Create error", error);
      return NextResponse.json(
        { error: "Failed to create chat" },
        { status: 500 }
      );
    }

    logger.info("MobileChats", `Created chat: ${chat.id}`);

    return NextResponse.json({
      success: true,
      chat,
    });
  } catch (error) {
    logger.error("MobileChats", "POST error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mobile/chats
 *
 * Soft delete a chat.
 * Uses Clerk JWT validation for security.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify mobile auth
    const auth = await verifyMobileAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const chat_id = searchParams.get("chat_id");

    if (!chat_id) {
      return NextResponse.json(
        { success: false, error: "chat_id query param is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Verify chat belongs to account before deleting
    const { data: existingChat, error: verifyError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chat_id)
      .eq("account_id", auth.accountId)
      .single();

    if (verifyError || !existingChat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from("chats")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", chat_id);

    if (error) {
      logger.error("MobileChats", "Delete error", error);
      return NextResponse.json(
        { error: "Failed to delete chat" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error("MobileChats", "DELETE error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
