import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateTaskSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "tasks", action: "read" },
    logTag: "Tasks",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("crm_tasks")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "tasks", action: "update" },
    bodySchema: updateTaskSchema,
    logTag: "Tasks",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // If status changing to done, set completed_at
    const updateData = { ...body } as Record<string, unknown>;
    if (body.status === "done") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error: dbError } = await supabase
      .from("crm_tasks")
      .update(updateData)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    try {
      if (body.status === "done") {
        await supabase.from("crm_activities").insert({
          account_id: ctx.accountId,
          team_id: ctx.workspaceId,
          contact_id: data.contact_id,
          deal_id: data.deal_id,
          type: "task_completed",
          title: `Task completed: ${data.title}`,
        });
      } else {
        await supabase.from("crm_activities").insert({
          account_id: ctx.accountId,
          team_id: ctx.workspaceId,
          contact_id: data.contact_id,
          deal_id: data.deal_id,
          type: "task_updated",
          title: `Task updated: ${data.title}`,
        });
      }
    } catch (e) { logger.error("Tasks", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "tasks", action: "delete" },
    logTag: "Tasks",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("crm_tasks")
      .select("title, contact_id, deal_id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { error: dbError } = await supabase
      .from("crm_tasks")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: existing?.contact_id,
        deal_id: existing?.deal_id,
        type: "task_deleted",
        title: `Task deleted: ${existing?.title || "Unknown"}`,
      });
    } catch (e) { logger.error("Tasks", "Failed to log activity", e); }

    return NextResponse.json({ success: true });
  }
);
