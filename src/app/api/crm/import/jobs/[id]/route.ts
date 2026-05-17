import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { getImportJob } from "@/lib/importers/job-store";

/**
 * GET /api/crm/import/jobs/:id
 * Poll a single job's progress.
 */
export const GET = withApiHandler(
  { permission: { resource: "contacts", action: "read" }, logTag: "Importer" },
  async (_request, ctx, { routeParams }) => {
    if (!routeParams.id) throw new ApiError("Missing job id", 400);
    const job = await getImportJob(routeParams.id, ctx.workspaceId);
    if (!job) throw new ApiError("Job not found", 404);
    return NextResponse.json({ success: true, data: job });
  },
);
