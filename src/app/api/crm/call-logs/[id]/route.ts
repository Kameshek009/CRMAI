import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateCallLogSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";

export const GET = withApiHandler(
  {
    permission: { resource: "call_logs", action: "read" },
    logTag: "CallLogs",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("call_logs")
      .select("*, contacts(id, first_name, last_name)")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Call log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "call_logs", action: "update" },
    bodySchema: updateCallLogSchema,
    logTag: "CallLogs",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("call_logs")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select("*, contacts(id, first_name, last_name)")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Call log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "call_logs", action: "delete" },
    logTag: "CallLogs",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("call_logs")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete call log", 500);

    return NextResponse.json({ success: true });
  }
);
