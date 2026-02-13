import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/desktop/sync/chats
 *
 * Get all chats for the authenticated account.
 * Query params:
 *   - account_id: (optional) filter by account
 *   - chat_id: (optional) get specific chat
 *   - since: (optional) ISO date to get chats updated after this time
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

    const supabase = createSupabaseAdmin();

    // Get single chat
    if (chatId) {
      const { data: chat, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .eq("account_id", tokenData.account_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(
            { success: false, error: "Chat not found" },
            { status: 404 }
          );
        }
        throw error;
      }

      return NextResponse.json({ success: true, chat });
    }

    // Get all chats for account
    let query = supabase
      .from("chats")
      .select("*")
      .eq("account_id", tokenData.account_id)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (since) {
      query = query.gte("updated_at", since);
    }

    const { data: chats, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, chats: chats || [] });
  } catch (error) {
    console.error("[desktop/sync/chats] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get chats" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/desktop/sync/chats
 *
 * Create or update a chat.
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
    const { id, title, mode, device_origin, vision_board_id } = body;

    const supabase = createSupabaseAdmin();

    // Check if chat exists
    if (id) {
      const { data: existing } = await supabase
        .from("chats")
        .select("id")
        .eq("id", id)
        .eq("account_id", tokenData.account_id)
        .single();

      if (existing) {
        // Update existing chat
        const { data: chat, error } = await supabase
          .from("chats")
          .update({
            title,
            mode,
            device_origin,
            vision_board_id,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ success: true, chat, action: "updated" });
      }
    }

    // Create new chat
    const { data: chat, error } = await supabase
      .from("chats")
      .insert({
        id: id || undefined,
        account_id: tokenData.account_id,
        title,
        mode: mode || "chat",
        device_origin,
        vision_board_id,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    console.log("[desktop/sync/chats] Created chat:", chat.id);

    return NextResponse.json({ success: true, chat, action: "created" });
  } catch (error) {
    console.error("[desktop/sync/chats] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync chat" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/desktop/sync/chats
 *
 * Soft delete a chat.
 */
export async function DELETE(request: NextRequest) {
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

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: "chat_id is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Verify chat belongs to account
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("account_id", tokenData.account_id)
      .single();

    if (!existing) {
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
      .eq("id", chatId);

    if (error) throw error;

    console.log("[desktop/sync/chats] Deleted chat:", chatId);

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("[desktop/sync/chats] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
