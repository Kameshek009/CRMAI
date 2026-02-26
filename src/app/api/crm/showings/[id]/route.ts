import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateShowingSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "deals", action: "read" },
    logTag: "Showings",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("property_showings")
      .select("*, contacts:contact_id(first_name, last_name), deals:deal_id(title)")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Showing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "deals", action: "update" },
    bodySchema: updateShowingSchema,
    logTag: "Showings",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("property_showings")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select("*, contacts:contact_id(first_name, last_name), deals:deal_id(title)")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Showing not found" }, { status: 404 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: data.contact_id,
        deal_id: data.deal_id,
        type: "meeting",
        title: `Showing updated: ${data.title}`,
      });
    } catch (e) { logger.error("Showings", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "deals", action: "delete" },
    logTag: "Showings",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("property_showings")
      .select("title, contact_id, deal_id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { error: dbError } = await supabase
      .from("property_showings")
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
        type: "meeting",
        title: `Showing deleted: ${existing?.title || "Unknown"}`,
      });
    } catch (e) { logger.error("Showings", "Failed to log activity", e); }

    return NextResponse.json({ success: true });
  }
);
