import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { listImportJobs } from "@/lib/importers/job-store";

/**
 * GET /api/crm/import/jobs
 * Recent import history for the current workspace (last 30 jobs).
 */
export const GET = withApiHandler(
  { permission: { resource: "contacts", action: "read" }, logTag: "Importer" },
  async (_request, ctx) => {
    const jobs = await listImportJobs(ctx.workspaceId);
    return NextResponse.json({ success: true, data: jobs });
  },
);
