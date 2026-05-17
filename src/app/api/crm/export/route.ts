import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { ENTITY_CONFIG, CHUNK_SIZE, rowToCsv } from "@/lib/crm/export-utils";

export async function GET(request: NextRequest) {
  const rlError = await checkRateLimit(request, { limit: 5 });
  if (rlError) return rlError;

  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const entity = request.nextUrl.searchParams.get("entity");
  if (!entity || !ENTITY_CONFIG[entity]) {
    return NextResponse.json({ success: false, error: "Invalid entity" }, { status: 400 });
  }

  const format = request.nextUrl.searchParams.get("format") || "csv";
  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ success: false, error: "Invalid format. Supported: csv, json" }, { status: 400 });
  }

  const config = ENTITY_CONFIG[entity];
  const supabase = createSupabaseAdmin();
  const date = new Date().toISOString().split("T")[0];

  const fetchChunk = async (offset: number) => {
    const { data, error: dbError } = await supabase
      .from(config.table)
      .select(config.columns.join(","))
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + CHUNK_SIZE - 1);
    if (dbError || !data || data.length === 0) return null;
    return data as unknown as Record<string, unknown>[];
  };

  if (format === "json") {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`{"entity":"${entity}","data":[`));

        let offset = 0;
        let isFirst = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const rows = await fetchChunk(offset);
          if (!rows) break;

          for (const row of rows) {
            const prefix = isFirst ? "" : ",";
            controller.enqueue(encoder.encode(prefix + JSON.stringify(row)));
            isFirst = false;
          }

          if (rows.length < CHUNK_SIZE) break;
          offset += CHUNK_SIZE;
        }

        controller.enqueue(encoder.encode("]}"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${entity}_${date}.json"`,
        "Transfer-Encoding": "chunked",
      },
    });
  }

  // CSV format
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(config.columns.join(",") + "\n"));

      let offset = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rows = await fetchChunk(offset);
        if (!rows) break;

        const chunk = rows.map((row) => rowToCsv(row, config.columns)).join("\n") + "\n";
        controller.enqueue(encoder.encode(chunk));

        if (rows.length < CHUNK_SIZE) break;
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
