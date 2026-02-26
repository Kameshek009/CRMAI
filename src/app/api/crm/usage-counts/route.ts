import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { getAllUsageCounts } from "@/lib/usage/feature-limits";

export const GET = withApiHandler(
  { logTag: "UsageCounts" },
  async (_request, ctx) => {
    const counts = await getAllUsageCounts(ctx.workspaceId, ctx.tier);

    return NextResponse.json({ success: true, data: counts });
  }
);
