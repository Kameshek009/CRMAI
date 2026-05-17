/**
 * Job-runner: drives one provider end-to-end and surfaces progress to
 * `crm_imports`. Designed to be called from a Vercel route handler in
 * fire-and-forget mode (the route returns 202 immediately; the runner
 * keeps executing until the function timeout).
 *
 * For larger imports we'll want to push this into a real queue (Inngest /
 * Trigger.dev) but the in-route runner is fine for tens of thousands of
 * rows since Vercel Pro gives us 60s of execution and Hobby gives 10s. On
 * Hobby the job will be marked `failed` if it can't finish; UI tells the
 * user to upgrade.
 */

import { logger } from "@/lib/logger";
import {
  markJobCompleted,
  markJobFailed,
  markJobRunning,
  mergeProgress,
} from "./job-store";
import type {
  ImportContext,
  ImportProgress,
  ImporterProvider,
} from "./types";

export async function executeImportJob(args: {
  jobId: string;
  teamId: string;
  accountId: string;
  accessToken: string;
  connectionMetadata: Record<string, unknown>;
  provider: ImporterProvider;
}): Promise<void> {
  const { jobId, provider } = args;
  await markJobRunning(jobId);

  const ctx: ImportContext = {
    teamId: args.teamId,
    accountId: args.accountId,
    jobId,
    accessToken: args.accessToken,
    connectionMetadata: args.connectionMetadata,
    reportProgress: async (delta: Partial<ImportProgress>) => {
      await mergeProgress(jobId, {
        total: delta.total,
        imported: delta.imported,
        skipped: delta.skipped,
        errors: delta.errors,
      });
    },
  };

  try {
    await provider.run(ctx);
    await markJobCompleted(jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("Importer", `Job ${jobId} (${provider.id}) failed`, e);
    await markJobFailed(jobId, message);
  }
}
