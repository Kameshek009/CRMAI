import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createImportJob } from "@/lib/importers/job-store";
import { getImporterProvider } from "@/lib/importers/registry";
import { executeImportJob } from "@/lib/importers/runner";
import { getOAuthConnection, getValidAccessToken } from "@/lib/oauth/tokens";
import type { OAuthProvider } from "@/lib/oauth/tokens";
import {
  SUPPORTED_IMPORTER_PROVIDERS,
  type ImporterProviderId,
} from "@/lib/importers/types";
import { logger } from "@/lib/logger";

function isImporterProvider(value: string): value is ImporterProviderId {
  return (SUPPORTED_IMPORTER_PROVIDERS as string[]).includes(value);
}

/**
 * POST /api/crm/import/<provider>/run
 *
 * Kicks off an import in the request-handler. We respond 202 with the job
 * id immediately; the actual run continues until the Vercel function
 * timeout (60s on Pro, 10s on Hobby — Hobby will mark large imports as
 * failed). The job-runner persists progress to `crm_imports` so the UI
 * can poll regardless of which run instance owns it.
 *
 * Permissions: requires `contacts:create` since import primarily adds
 * contacts.
 */
export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "create" },
    logTag: "Importer",
  },
  async (_request, ctx, { routeParams }) => {
    const providerId = routeParams.provider ?? "";
    if (!isImporterProvider(providerId)) {
      throw new ApiError(`Unsupported importer provider: ${providerId}`, 400);
    }
    const provider = getImporterProvider(providerId);
    if (!provider) {
      throw new ApiError(`Importer ${providerId} is not yet implemented`, 501);
    }
    const oauthProvider = providerId as OAuthProvider;
    const connection = await getOAuthConnection(ctx.workspaceId, oauthProvider);
    if (!connection) {
      throw new ApiError(`No ${provider.label} connection — connect first`, 400);
    }
    const accessToken = await getValidAccessToken(connection);
    const job = await createImportJob({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      provider: providerId,
    });

    // Fire-and-forget — the function keeps running until the runtime cap.
    void executeImportJob({
      jobId: job.id,
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      accessToken,
      connectionMetadata: connection.metadata ?? {},
      provider,
    }).catch((e) => {
      logger.error("Importer", `executeImportJob threw uncaught`, e);
    });

    return NextResponse.json({ success: true, data: { job_id: job.id } }, { status: 202 });
  },
);
