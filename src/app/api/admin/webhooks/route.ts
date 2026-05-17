import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createWebhookSchema } from "@/lib/crm/webhook-validation";
import { generateWebhookSecret } from "@/lib/webhooks/signing";

const LIST_FIELDS =
  "id, name, url, event_types, is_active, last_delivery_at, last_delivery_status, created_at, created_by_clerk_user_id";

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "Webhooks",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .select(LIST_FIELDS)
      .eq("team_id", ctx.workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw new ApiError("Failed to fetch webhooks", 500);
    return NextResponse.json({ success: true, data });
  },
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: createWebhookSchema,
    logTag: "Webhooks",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { plaintext, encrypted } = generateWebhookSecret();

    const { data, error } = await supabase
      .from("webhook_endpoints")
      .insert({
        team_id: ctx.workspaceId,
        account_id: ctx.accountId,
        name: body.name ?? null,
        url: body.url,
        event_types: body.event_types,
        secret_encrypted: encrypted,
      })
      .select(LIST_FIELDS)
      .single();

    if (error || !data) throw new ApiError("Failed to create webhook", 500);

    // plaintext shown ONCE; stored only encrypted.
    return NextResponse.json({ success: true, data: { ...data, plaintext } });
  },
);
