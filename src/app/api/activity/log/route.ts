import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const logActivitySchema = z.object({
  eventType: z.enum(["session_start", "session_end", "action_executed", "error", "warning", "info"]),
  message: z.string(),
  sessionId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/activity/log
 * Log an activity event from the desktop app
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
    const parsed = logActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { eventType, message, sessionId, metadata } = parsed.data;
    const supabase = createSupabaseAdmin();

    // Get account
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const accountId = accountData.id as string;

    // Verify session belongs to user if provided
    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("account_id", accountId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { success: false, error: "Session not found" },
          { status: 404 }
        );
      }
    }

    // Create activity log
    const { data: log, error: logError } = await supabase
      .from("activity_logs")
      .insert({
        account_id: accountId,
        session_id: sessionId || null,
        event_type: eventType,
        message,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create activity log:", logError);
      return NextResponse.json(
        { success: false, error: "Failed to log activity" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        logId: log.id,
        eventType: log.event_type,
        createdAt: log.created_at,
      },
    });
  } catch (error) {
    console.error("Activity logging error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/activity/log
 * Get activity logs for the authenticated user
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
    const sessionIdParam = searchParams.get("sessionId");
    const eventType = searchParams.get("eventType");
    const supabase = createSupabaseAdmin();

    // Get account
    const { data: accountData2, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !accountData2) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const accountIdForQuery = accountData2.id as string;

    // Build query
    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .eq("account_id", accountIdForQuery)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionIdParam) {
      query = query.eq("session_id", sessionIdParam);
    }

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error("Failed to fetch activity logs:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: count,
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
