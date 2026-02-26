import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateNoteSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export const PATCH = withApiHandler(
  {
    permission: { resource: "contacts", action: "update" },
    bodySchema: updateNoteSchema,
    logTag: "Notes",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("crm_notes")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("account_id", ctx.accountId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: data.contact_id,
        deal_id: data.deal_id,
        company_id: data.company_id,
        type: "note_updated",
        title: "Note updated",
      });
    } catch (e) { logger.error("Notes", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "contacts", action: "delete" },
    logTag: "Notes",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("crm_notes")
      .select("contact_id, deal_id, company_id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("account_id", ctx.accountId)
      .single();

    const { error: dbError } = await supabase
      .from("crm_notes")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("account_id", ctx.accountId);

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: existing?.contact_id,
        deal_id: existing?.deal_id,
        company_id: existing?.company_id,
        type: "note_deleted",
        title: "Note deleted",
      });
    } catch (e) { logger.error("Notes", "Failed to log activity", e); }

    return NextResponse.json({ success: true });
  }
);
