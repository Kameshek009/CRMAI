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
    // Find duplicates by email
    const { data: emailDups } = await supabase.rpc("find_contact_email_duplicates", {
      p_team_id: context.workspaceId,
    }).select("*");

    if (!emailDups) {
      // Fallback: manual query for email duplicates
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id,first_name,last_name,email,phone,status,created_at")
        .eq("team_id", context.workspaceId)
        .eq("is_deleted", false)
        .not("email", "is", null)
        .order("created_at", { ascending: true });

      if (contacts) {
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
      }
    }

    // Find duplicates by phone
    const { data: contacts2 } = await supabase
      .from("contacts")
      .select("id,first_name,last_name,email,phone,status,created_at")
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .not("phone", "is", null)
      .order("created_at", { ascending: true });

    if (contacts2) {
      const byPhone = new Map<string, typeof contacts2>();
      for (const c of contacts2) {
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
    }

    // Find duplicates by name
    const { data: contacts3 } = await supabase
      .from("contacts")
      .select("id,first_name,last_name,email,phone,status,created_at")
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (contacts3) {
      const byName = new Map<string, typeof contacts3>();
      for (const c of contacts3) {
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
    // Companies: duplicates by domain
    const { data: companies } = await supabase
      .from("companies")
      .select("id,name,domain,industry,size,created_at")
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .not("domain", "is", null)
      .order("created_at", { ascending: true });

    if (companies) {
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
    }

    // Companies: duplicates by name
    const { data: companies2 } = await supabase
      .from("companies")
      .select("id,name,domain,industry,size,created_at")
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (companies2) {
      const byName = new Map<string, typeof companies2>();
      for (const c of companies2) {
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

  return NextResponse.json({ success: true, data: groups, total: groups.length });
}
