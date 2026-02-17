import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/chats
 *
 * Fetch all chats for the authenticated user.
 * Uses Clerk auth + server-side Supabase (service role) for security.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

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

    // Get chats with messages for the account
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select(`
        *,
        messages (
          id,
          content,
          created_at
        )
      `)
      .eq("account_id", account.id)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (chatsError) {
      logger.error("Chats", "Error fetching chats", chatsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch chats" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, chats: chats || [] });
  } catch (error) {
    logger.error("Chats", "GET error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats
 *
 * Create a new chat for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mode = "chat" } = body;

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

    // Create new chat
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .insert({
        account_id: account.id,
        mode,
        device_origin: "web",
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (chatError) {
      logger.error("Chats", "Error creating chat", chatError);
      return NextResponse.json(
        { success: false, error: "Failed to create chat" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, chat });
  } catch (error) {
    logger.error("Chats", "POST error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats
 *
 * Soft delete a chat for the authenticated user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chat_id");

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: "chat_id is required" },
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

    // Verify chat belongs to account before deleting
    const { data: existingChat, error: verifyError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", account.id)
      .single();

    if (verifyError || !existingChat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // Soft delete the chat
    const { error: deleteError } = await supabase
      .from("chats")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId);

    if (deleteError) {
      logger.error("Chats", "Error deleting chat", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete chat" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    logger.error("Chats", "DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
