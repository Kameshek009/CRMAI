import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/crm/helpers";
import { updateWebhookSchema } from "@/lib/crm/webhook-validation";

const DETAIL_FIELDS =
  "id, name, url, event_types, is_active, last_delivery_at, last_delivery_status, created_at, created_by_clerk_user_id";

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "Webhooks",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .select(DETAIL_FIELDS)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .maybeSingle();

    if (error) throw new ApiError("Failed to load webhook", 500);
    if (!data) {
      return NextResponse.json({ success: false, error: "Webhook not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  },
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: updateWebhookSchema,
    logTag: "Webhooks",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select(DETAIL_FIELDS)
      .maybeSingle();

    if (error) throw new ApiError("Failed to update webhook", 500);
    if (!data) {
      return NextResponse.json({ success: false, error: "Webhook not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  },
);

// DELETE is a soft-deactivation: webhook_deliveries.endpoint_id has ON DELETE
// CASCADE, so a hard delete would wipe the entire delivery audit trail. The
// dispatcher already filters on is_active=true, so this stops outbound traffic.
export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "Webhooks",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();
    const { data: existing } = await supabase
      .from("webhook_endpoints")
      .select("id, is_active")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Webhook not found" }, { status: 404 });
    }
    if (!existing.is_active) {
      return NextResponse.json({ success: false, error: "Already deactivated" }, { status: 400 });
    }

    const { error } = await supabase
      .from("webhook_endpoints")
      .update({ is_active: false })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (error) throw new ApiError("Failed to deactivate webhook", 500);
    return NextResponse.json({ success: true });
  },
);
