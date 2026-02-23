import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const ENTITY_CONFIG: Record<string, { table: string; columns: string[] }> = {
  contacts: {
    table: "contacts",
    columns: ["id", "first_name", "last_name", "email", "phone", "status", "source", "created_at"],
  },
  deals: {
    table: "deals",
    columns: ["id", "title", "value", "currency", "stage", "probability", "expected_close_date", "created_at"],
  },
  companies: {
    table: "companies",
    columns: ["id", "name", "industry", "size", "domain", "created_at"],
  },
  tasks: {
    table: "tasks",
    columns: ["id", "title", "description", "status", "priority", "due_date", "created_at"],
  },
};

const CHUNK_SIZE = 1000;

function escapeCsvValue(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((col) => escapeCsvValue(row[col])).join(",");
}

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
