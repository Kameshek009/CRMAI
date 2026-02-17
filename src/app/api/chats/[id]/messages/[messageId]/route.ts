import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/chats/[id]/messages/[messageId]
 *
 * Delete a single message from a chat.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: chatId, messageId } = await params;

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
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", account.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // Verify message belongs to chat
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id")
      .eq("id", messageId)
      .eq("chat_id", chatId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    // Delete message
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("ChatMessageDelete", "Failed to delete message", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
