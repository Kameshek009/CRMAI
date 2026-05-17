import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import {
  deleteOAuthConnection,
  getOAuthConnection,
} from "@/lib/oauth/tokens";
import { revokeGoogleToken } from "@/lib/oauth/google";
import { decryptToken } from "@/lib/api-auth/token-crypto";
import { logger } from "@/lib/logger";

/**
 * POST /api/oauth/google/disconnect
 *
 * Revokes the Google refresh token (so Google forgets us) and deletes the
 * `oauth_tokens` row. We attempt revocation best-effort — failure on Google's
 * side must not block the user from removing the local record.
 */
export const POST = withApiHandler(
  { permission: { resource: "team_settings", action: "manage" }, logTag: "OAuthGoogle" },
  async (_request, ctx) => {
    const row = await getOAuthConnection(ctx.workspaceId, "google");
    if (!row) {
      throw new ApiError("No Google connection found", 404);
    }
    try {
      if (row.refresh_token_encrypted) {
        const refresh = decryptToken(row.refresh_token_encrypted);
        await revokeGoogleToken(refresh);
      }
    } catch (e) {
      logger.warn("OAuthGoogle", "revoke failed (continuing)", e);
    }
    await deleteOAuthConnection(row.id);
    return NextResponse.json({ success: true });
  },
);
