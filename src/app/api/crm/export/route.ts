import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { ENTITY_CONFIG, CHUNK_SIZE, escapeCsvValue, rowToCsv } from "@/lib/crm/export-utils";

export async function GET(request: NextRequest) {
  const rlError = checkRateLimit(request, { limit: 5 });
  if (rlError) return rlError;

  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const entity = request.nextUrl.searchParams.get("entity");
  if (!entity || !ENTITY_CONFIG[entity]) {
    return NextResponse.json({ success: false, error: "Invalid entity" }, { status: 400 });
  }

  const config = ENTITY_CONFIG[entity];
  const supabase = createSupabaseAdmin();
  const date = new Date().toISOString().split("T")[0];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Header row
      controller.enqueue(encoder.encode(config.columns.join(",") + "\n"));

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error: dbError } = await supabase
          .from(config.table)
          .select(config.columns.join(","))
          .eq("team_id", context.workspaceId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .range(offset, offset + CHUNK_SIZE - 1);

        if (dbError || !data || data.length === 0) {
          hasMore = false;
          break;
        }

        const rows = data as unknown as Record<string, unknown>[];
        const chunk = rows.map((row) => rowToCsv(row, config.columns)).join("\n") + "\n";
        controller.enqueue(encoder.encode(chunk));

        hasMore = data.length === CHUNK_SIZE;
        offset += CHUNK_SIZE;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entity}_${date}.csv"`,
      "Transfer-Encoding": "chunked",
    },
  });
}
