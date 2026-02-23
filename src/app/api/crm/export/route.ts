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

function escapeCsvValue(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvValue(row[col])).join(",")
  );
  return [header, ...lines].join("\n");
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

  const { data, error: dbError } = await createSupabaseAdmin()
    .from(config.table)
    .select(config.columns.join(","))
    .eq("team_id", context.workspaceId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to export data" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ success: false, error: "No data to export" }, { status: 404 });
  }

  const csv = toCsv(data as unknown as Record<string, unknown>[], config.columns);
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entity}_${date}.csv"`,
    },
  });
}
