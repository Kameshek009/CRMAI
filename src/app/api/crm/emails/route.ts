import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createEmailSchema } from "@/lib/crm/validation";
import { parsePagination } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "read", context.isDirector);
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const contactId = searchParams.get("contact_id");
    const dealId = searchParams.get("deal_id");
    const leadId = searchParams.get("lead_id");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("email_communications")
      .select("*", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (contactId) query = query.eq("contact_id", contactId);
    if (dealId) query = query.eq("deal_id", dealId);
    if (leadId) query = query.eq("lead_id", leadId);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Emails", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch emails" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Emails", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_communications")
      .insert({
        account_id: context.accountId,
        team_id: context.teamId,
        ...parsed.data,
      })
      .select()
      .single();

    if (dbError) {
      logger.error("Emails", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to create email" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: parsed.data.contact_id || null,
        lead_id: parsed.data.lead_id || null,
        deal_id: parsed.data.deal_id || null,
        type: "email",
        title: `Email: ${parsed.data.subject || "(no subject)"}`,
        description: parsed.data.body_text?.slice(0, 200) || null,
      });
    } catch (e) { logger.warn("Emails", "Failed to log activity", e); }

    // Exit condition: inbound email exits active sequence enrollments
    if (parsed.data.direction === "inbound") {
      try {
        const contactId = parsed.data.contact_id;
        const leadId = parsed.data.lead_id;
        if (contactId || leadId) {
          let exitQuery = supabase
            .from("email_sequence_enrollments")
            .update({ status: "exited_reply", updated_at: new Date().toISOString() })
            .eq("status", "active");
          if (contactId) exitQuery = exitQuery.eq("contact_id", contactId);
          else if (leadId) exitQuery = exitQuery.eq("lead_id", leadId);
          await exitQuery;
        }
      } catch (e) { logger.warn("Emails", "Failed to exit sequence enrollments", e); }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Emails", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
