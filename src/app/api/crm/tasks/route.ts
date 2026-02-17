import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parsePagination } from "@/lib/crm/helpers";
import { createTaskSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "tasks", "read", context.isDirector);
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const contactId = searchParams.get("contact_id");
    const dealId = searchParams.get("deal_id");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("crm_tasks")
      .select("*", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .order("due_date", { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (contactId) query = query.eq("contact_id", contactId);
    if (dealId) query = query.eq("deal_id", dealId);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Tasks", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Tasks", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "tasks", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("crm_tasks")
      .insert({ account_id: context.accountId, team_id: context.teamId, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      logger.error("Tasks", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: parsed.data.contact_id || null,
        deal_id: parsed.data.deal_id || null,
        type: "task_created",
        title: `Task created: ${data.title}`,
      });
    } catch (e) { logger.warn("Tasks", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Tasks", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
