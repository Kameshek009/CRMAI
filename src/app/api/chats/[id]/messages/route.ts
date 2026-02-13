import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/chats/[id]/messages
 *
 * Fetch all messages for a specific chat.
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

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    });
  } catch (error) {
    console.error("[api/chats/[id]/messages] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats/[id]/messages
 *
 * Send a new message in a chat.
 */
export async function POST(
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
    const { role, content, metadata, message_type = "text" } = body;

    if (!role || !content) {
      return NextResponse.json(
        { success: false, error: "role and content are required" },
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

    // Create message
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role,
        content,
        metadata: metadata || {},
        message_type,
        device_origin: "web",
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
    console.error("[api/chats/[id]/messages] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
