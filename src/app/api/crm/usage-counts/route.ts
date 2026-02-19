import { NextResponse } from "next/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { getAllUsageCounts } from "@/lib/usage/feature-limits";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const counts = await getAllUsageCounts(context.workspaceId, context.tier);

    return NextResponse.json({ success: true, data: counts });
  } catch (error) {
    logger.error("UsageCounts", "GET error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
