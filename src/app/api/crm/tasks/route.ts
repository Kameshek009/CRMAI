import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createTaskSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "tasks", action: "read" },
    logTag: "Tasks",
  },
  async (request, ctx) => {
    const url = new URL(request.url);
    const params = parseListParams(url);
    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("crm_tasks")
      .select("*", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "tasks", params, ["title"]);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Database operation failed", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "tasks", action: "create" },
    featureLimit: "tasks",
    bodySchema: createTaskSchema,
    logTag: "Tasks",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("crm_tasks")
      .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
      .select()
      .single();

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: body.contact_id || null,
        deal_id: body.deal_id || null,
        type: "task_created",
        title: `Task created: ${data.title}`,
      });
    } catch (e) { logger.error("Tasks", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);
