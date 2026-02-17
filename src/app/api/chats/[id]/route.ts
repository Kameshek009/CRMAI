import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/chats/[id]
 *
 * Fetch a specific chat with its messages for the authenticated user.
 * Uses Clerk auth + server-side Supabase (service role) for security.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: chatId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get account by Clerk user ID
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Fetch chat - verify it belongs to the account
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .eq("account_id", account.id)
      .single();

    if (chatError) {
      if (chatError.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Chat not found" },
          { status: 404 }
        );
      }
      throw chatError;
    }

    // Fetch messages for the chat
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      logger.error("ChatDetail", "Error fetching messages", messagesError);
      throw messagesError;
    }

    // Fetch vision board if exists
    let visionBoard = null;
    if (chat.vision_board_id) {
      const { data: boardData } = await supabase
        .from("vision_boards")
        .select("*")
        .eq("id", chat.vision_board_id)
        .eq("account_id", account.id)
        .single();

      visionBoard = boardData || null;
    }

    return NextResponse.json({
      success: true,
      chat,
      messages: messages || [],
      visionBoard,
    });
  } catch (error) {
    logger.error("ChatDetail", "GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chats/[id]
 *
 * Update a chat's title or mode.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: chatId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, mode } = body;

    const supabase = createSupabaseAdmin();

    // Get account by Clerk user ID
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Verify chat belongs to account
    const { data: existing, error: verifyError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", account.id)
      .single();

    if (verifyError || !existing) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updates.title = title;
    if (mode !== undefined) updates.mode = mode;

    // Update chat
    const { data: chat, error: updateError } = await supabase
      .from("chats")
      .update(updates)
      .eq("id", chatId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, chat });
  } catch (error) {
    logger.error("ChatDetail", "PATCH error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats/[id]
 *
 * Soft delete a chat.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: chatId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get account by Clerk user ID
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Verify chat belongs to account
    const { data: existing, error: verifyError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", account.id)
      .single();

    if (verifyError || !existing) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from("chats")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    logger.error("ChatDetail", "DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
