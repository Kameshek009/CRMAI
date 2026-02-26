import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";

const ENTITY_TABLES: Record<string, { table: string; nameField: string; selectFields: string }> = {
  contacts: { table: "contacts", nameField: "first_name,last_name", selectFields: "id,first_name,last_name,email,deleted_at,deleted_by" },
  companies: { table: "companies", nameField: "name", selectFields: "id,name,domain,deleted_at,deleted_by" },
  deals: { table: "deals", nameField: "title", selectFields: "id,title,value,deleted_at,deleted_by" },
  tasks: { table: "crm_tasks", nameField: "title", selectFields: "id,title,status,deleted_at,deleted_by" },
  notes: { table: "crm_notes", nameField: "content", selectFields: "id,content,deleted_at,deleted_by" },
  call_logs: { table: "call_logs", nameField: "summary", selectFields: "id,summary,to_number,deleted_at,deleted_by" },
};

const THIRTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
};

export const GET = withApiHandler(
  { logTag: "Trash" },
  async (request, ctx) => {
    const entityType = request.nextUrl.searchParams.get("entity_type") || "all";
    const supabase = createSupabaseAdmin();
    const cutoff = THIRTY_DAYS_AGO();

    const entitiesToQuery = entityType === "all"
      ? Object.keys(ENTITY_TABLES)
      : ENTITY_TABLES[entityType] ? [entityType] : [];

    if (entitiesToQuery.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid entity type" }, { status: 400 });
    }

    const results: Array<{
      id: string;
      entity_type: string;
      name: string;
      deleted_at: string;
      deleted_by: string | null;
    }> = [];

    await Promise.all(
      entitiesToQuery.map(async (entity) => {
        const config = ENTITY_TABLES[entity];
        const { data } = await supabase
          .from(config.table)
          .select(config.selectFields)
          .eq("team_id", ctx.workspaceId)
          .eq("is_deleted", true)
          .gte("deleted_at", cutoff)
          .order("deleted_at", { ascending: false })
          .limit(100);

        if (data) {
          for (const row of data) {
            let name = "";
            if (entity === "contacts") {
              name = `${(row as unknown as Record<string, string>).first_name || ""} ${(row as unknown as Record<string, string>).last_name || ""}`.trim();
            } else if (entity === "notes") {
              name = ((row as unknown as Record<string, string>).content || "").slice(0, 60);
            } else if (entity === "call_logs") {
              name = (row as unknown as Record<string, string>).summary || `Call to ${(row as unknown as Record<string, string>).to_number || "unknown"}`;
            } else {
              name = (row as unknown as Record<string, string>)[config.nameField.split(",")[0]] || "";
            }

            results.push({
              id: (row as unknown as Record<string, string>).id,
              entity_type: entity,
              name,
              deleted_at: (row as unknown as Record<string, string>).deleted_at,
              deleted_by: (row as unknown as Record<string, string>).deleted_by || null,
            });
          }
        }
      })
    );

    // Sort by deleted_at descending
    results.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

    return NextResponse.json({ success: true, data: results, total: results.length });
  }
);
