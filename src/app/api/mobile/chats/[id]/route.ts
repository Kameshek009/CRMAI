import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/auth/mobile";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/mobile/chats/[id]
 *
 * Fetch a specific chat with its messages.
 * Uses Clerk JWT validation for security.
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

    // Fetch chat - verify it belongs to the account
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .eq("account_id", auth.accountId)
      .eq("is_deleted", false)
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
      console.error("[mobile/chats/[id]] Error fetching messages:", messagesError);
      throw messagesError;
    }

    // Fetch vision board if exists
    let visionBoard = null;
    if (chat.vision_board_id) {
      const { data: boardData } = await supabase
        .from("vision_boards")
        .select("*")
        .eq("id", chat.vision_board_id)
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
    console.error("[mobile/chats/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mobile/chats/[id]
 *
 * Update a chat's title or mode.
 */
export async function PATCH(
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
    const { title, mode } = body;

    const supabase = createSupabaseAdmin();

    // Verify chat belongs to account
    const { data: existing, error: verifyError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", auth.accountId)
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
    console.error("[mobile/chats/[id]] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mobile/chats/[id]
 *
 * Soft delete a chat.
 */
export async function DELETE(
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
    const { data: existing, error: verifyError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", auth.accountId)
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
    console.error("[mobile/chats/[id]] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
