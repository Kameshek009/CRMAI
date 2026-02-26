import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parsePagination } from "@/lib/crm/helpers";
import { createNoteSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "contacts", action: "read" },
    logTag: "Notes",
  },
  async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const contactId = searchParams.get("contact_id");
    const dealId = searchParams.get("deal_id");
    const companyId = searchParams.get("company_id");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("crm_notes")
      .select("*", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("account_id", ctx.accountId)
      .eq("is_deleted", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (contactId) query = query.eq("contact_id", contactId);
    if (dealId) query = query.eq("deal_id", dealId);
    if (companyId) query = query.eq("company_id", companyId);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Database operation failed", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "create" },
    bodySchema: createNoteSchema,
    logTag: "Notes",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("crm_notes")
      .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
      .select()
      .single();

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: body.contact_id || null,
        deal_id: body.deal_id || null,
        company_id: body.company_id || null,
        type: "note",
        title: "Note added",
        description: body.content.slice(0, 200),
      });
    } catch (e) { logger.error("Notes", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);
