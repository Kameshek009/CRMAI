import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/crm/helpers";
import { generateWebhookSecret } from "@/lib/webhooks/signing";

export const POST = withApiHandler(
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
    const { plaintext, encrypted } = generateWebhookSecret();

    const { data, error } = await supabase
      .from("webhook_endpoints")
      .update({ secret_encrypted: encrypted })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select("id")
      .maybeSingle();

    if (error) throw new ApiError("Failed to rotate secret", 500);
    if (!data) {
      return NextResponse.json({ success: false, error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id: data.id, plaintext } });
  },
);
