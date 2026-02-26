import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parsePagination } from "@/lib/crm/helpers";

export const GET = withApiHandler(
  {
    permission: { resource: "contacts", action: "read" },
    logTag: "WhatsApp",
  },
  async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const contactId = searchParams.get("contact_id");
    const leadId = searchParams.get("lead_id");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("whatsapp_messages")
      .select("*", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (contactId) query = query.eq("contact_id", contactId);
    if (leadId) query = query.eq("lead_id", leadId);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Failed to fetch messages", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);
