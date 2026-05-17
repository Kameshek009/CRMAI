import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { getOAuthConnection } from "@/lib/oauth/tokens";
import { isGoogleOAuthConfigured } from "@/lib/oauth/config";

/**
 * GET /api/oauth/google/status
 *
 * Lightweight read for the Integrations UI — does the workspace currently
 * have a connected Google account? Returns the email/name from metadata for
 * display only; tokens stay server-side.
 */
export const GET = withApiHandler(
  { permission: { resource: "team_settings", action: "read" }, logTag: "OAuthGoogle" },
  async (_request, ctx) => {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json({ success: true, data: { configured: false, connected: false } });
    }
    const row = await getOAuthConnection(ctx.workspaceId, "google");
    if (!row) {
      return NextResponse.json({ success: true, data: { configured: true, connected: false } });
    }
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        connected: true,
        provider_user_id: row.provider_user_id,
        email: typeof metadata.email === "string" ? metadata.email : null,
        name: typeof metadata.name === "string" ? metadata.name : null,
        scopes: row.scopes,
        connected_at: typeof metadata.connected_at === "string" ? metadata.connected_at : null,
      },
    });
  },
);
