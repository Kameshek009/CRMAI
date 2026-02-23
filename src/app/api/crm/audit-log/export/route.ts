import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const CHUNK_SIZE = 1000;

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = checkRateLimit(request, { limit: 5, windowMs: 60_000 });
    if (rateLimited) return rateLimited;

    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "read", context.isOwner);
    if (permError) return permError;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const supabase = createSupabaseAdmin();
    const teamId = context.workspaceId;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // CSV header
        controller.enqueue(
          encoder.encode("id,created_at,action,entity_type,entity_id,actor_name,changes\n")
        );

        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from("audit_log")
            .select("id,created_at,action,entity_type,entity_id,actor_name,changes")
            .eq("team_id", teamId)
            .order("created_at", { ascending: false })
            .range(offset, offset + CHUNK_SIZE - 1);

          if (entityType) query = query.eq("entity_type", entityType);
          if (from) query = query.gte("created_at", from);
          if (to) query = query.lte("created_at", to);

          const { data, error: dbError } = await query;

          if (dbError) {
            logger.error("AuditLogExport", "query error", dbError);
            break;
          }

          if (!data || data.length === 0) {
            hasMore = false;
            break;
          }

          const rows = data
            .map((row) =>
              [
                escapeCSV(row.id),
                escapeCSV(row.created_at),
                escapeCSV(row.action),
                escapeCSV(row.entity_type),
                escapeCSV(row.entity_id),
                escapeCSV(row.actor_name),
                escapeCSV(row.changes),
              ].join(",")
            )
            .join("\n");

          controller.enqueue(encoder.encode(rows + "\n"));

          if (data.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            offset += CHUNK_SIZE;
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    logger.error("AuditLogExport", "GET error", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
