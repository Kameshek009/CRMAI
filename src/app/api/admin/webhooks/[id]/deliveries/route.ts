import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/crm/helpers";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "Webhooks",
  },
  async (request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: endpoint } = await supabase
      .from("webhook_endpoints")
      .select("id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .maybeSingle();

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Webhook not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const { data, error } = await supabase
      .from("webhook_deliveries")
      .select("id, event_type, http_status, attempts, delivered_at, failed_at, error, created_at")
      .eq("endpoint_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new ApiError("Failed to load deliveries", 500);
    return NextResponse.json({ success: true, data });
  },
);
