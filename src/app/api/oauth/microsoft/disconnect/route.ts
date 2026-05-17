import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import {
  deleteOAuthConnection,
  getOAuthConnection,
  getValidAccessToken,
} from "@/lib/oauth/tokens";
import { deleteOutlookSubscription } from "@/lib/inbox/microsoft";
import { logger } from "@/lib/logger";

export const POST = withApiHandler(
  { permission: { resource: "team_settings", action: "manage" }, logTag: "OAuthMicrosoft" },
  async (_request, ctx) => {
    const row = await getOAuthConnection(ctx.workspaceId, "microsoft");
    if (!row) throw new ApiError("No Microsoft connection found", 404);

    try {
      const meta = (row.metadata ?? {}) as { outlook_inbox?: { subscription_id?: string } };
      if (meta.outlook_inbox?.subscription_id) {
        const accessToken = await getValidAccessToken(row);
        await deleteOutlookSubscription(accessToken, meta.outlook_inbox.subscription_id);
      }
    } catch (e) {
      logger.warn("OAuthMicrosoft", "subscription delete failed (continuing)", e);
    }
    await deleteOAuthConnection(row.id);
    return NextResponse.json({ success: true });
  },
);
