import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";

interface DuplicateGroup {
  match_key: string;
  match_type: string;
  records: Record<string, unknown>[];
}

export async function GET(request: NextRequest) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const entity = request.nextUrl.searchParams.get("entity") || "contacts";

  if (!["contacts", "companies"].includes(entity)) {
    return NextResponse.json({ success: false, error: "Invalid entity type" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const groups: DuplicateGroup[] = [];

  if (entity === "contacts") {
    // Single query for all contacts (instead of 3 separate full scans)
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id,first_name,last_name,email,phone,status,created_at")
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (contacts) {
      // 1) Duplicates by email
      const byEmail = new Map<string, typeof contacts>();
      for (const c of contacts) {
        if (!c.email) continue;
        const key = (c.email as string).toLowerCase().trim();
        if (!byEmail.has(key)) byEmail.set(key, []);
        byEmail.get(key)!.push(c);
      }
      for (const [key, recs] of byEmail) {
        if (recs.length > 1) {
          groups.push({ match_key: key, match_type: "email", records: recs });
        }
      }

      // 2) Duplicates by phone (skip groups already found by email)
      const byPhone = new Map<string, typeof contacts>();
      for (const c of contacts) {
        if (!c.phone) continue;
        const key = (c.phone as string).replace(/\D/g, "");
        if (key.length < 7) continue;
        if (!byPhone.has(key)) byPhone.set(key, []);
        byPhone.get(key)!.push(c);
      }
      const existingKeys = new Set(groups.map((g) => g.records.map((r) => (r as Record<string, string>).id).sort().join(",")));
      for (const [key, recs] of byPhone) {
        if (recs.length > 1) {
          const groupKey = recs.map((r) => r.id).sort().join(",");
          if (!existingKeys.has(groupKey)) {
            groups.push({ match_key: key, match_type: "phone", records: recs });
          }
        }
      }

      // 3) Duplicates by name (skip contacts already in groups)
      const byName = new Map<string, typeof contacts>();
      for (const c of contacts) {
        const name = `${(c.first_name || "").toLowerCase().trim()} ${(c.last_name || "").toLowerCase().trim()}`.trim();
        if (name.length < 3) continue;
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(c);
      }
      const existingIds = new Set(groups.flatMap((g) => g.records.map((r) => (r as Record<string, string>).id)));
      for (const [key, recs] of byName) {
        if (recs.length > 1) {
          const allNew = recs.every((r) => !existingIds.has(r.id));
          if (allNew) {
            groups.push({ match_key: key, match_type: "name", records: recs });
          }
        }
      }
    }
  } else {
    // Single query for all companies (instead of 2 separate scans)
    const { data: companies } = await supabase
      .from("companies")
      .select("id,name,domain,industry,size,created_at")
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (companies) {
      // 1) Duplicates by domain
      const byDomain = new Map<string, typeof companies>();
      for (const c of companies) {
        if (!c.domain) continue;
        const key = (c.domain as string).toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
        if (!byDomain.has(key)) byDomain.set(key, []);
        byDomain.get(key)!.push(c);
      }
      for (const [key, recs] of byDomain) {
        if (recs.length > 1) {
          groups.push({ match_key: key, match_type: "domain", records: recs });
        }
      }

      // 2) Duplicates by name (skip companies already in groups)
      const byName = new Map<string, typeof companies>();
      for (const c of companies) {
        const name = ((c.name as string) || "").toLowerCase().trim();
        if (name.length < 2) continue;
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(c);
      }
      const existingIds = new Set(groups.flatMap((g) => g.records.map((r) => (r as Record<string, string>).id)));
      for (const [key, recs] of byName) {
        if (recs.length > 1) {
          const allNew = recs.every((r) => !existingIds.has(r.id));
          if (allNew) {
            groups.push({ match_key: key, match_type: "name", records: recs });
          }
        }
      }
    }
  }

  // Limit response size to prevent huge payloads
  const limitedGroups = groups.slice(0, 200);
  return NextResponse.json({ success: true, data: limitedGroups, total: groups.length });
}
