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

    // Fetch chat list with last message preview via DB function (single query)
    const { data: chatList, error } = await supabase
      .rpc("get_chat_list", { p_account_id: auth.accountId, p_limit: 50 });

    if (error) {
      logger.error("MobileChats", "List error", error);
      return NextResponse.json(
        { error: "Failed to fetch chats" },
        { status: 500 }
      );
    }

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
