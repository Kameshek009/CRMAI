import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "update", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();
    const stageId = body.stage_id;
    const dealTitle = body.deal_title;

    const supabase = createSupabaseAdmin();

    // Get lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    if (lead.converted_at) {
      return NextResponse.json({ success: false, error: "Lead already converted" }, { status: 400 });
    }

    // Create contact from lead
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        account_id: context.accountId,
        team_id: context.teamId,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone || lead.mobile,
        title: lead.job_title,
        source: lead.source,
        status: "active",
      })
      .select()
      .single();

    if (contactError || !contact) {
      logger.error("Leads", "Failed to create contact from lead", contactError);
      return NextResponse.json({ success: false, error: "Failed to create contact" }, { status: 500 });
    }

    // Create deal
    let deal = null;
    if (stageId) {
      const { data: dealData, error: dealError } = await supabase
        .from("deals")
        .insert({
          account_id: context.accountId,
          team_id: context.teamId,
          title: dealTitle || `${lead.first_name} ${lead.last_name || ""} - Deal`.trim(),
          contact_id: contact.id,
          stage_id: stageId,
          status: "open",
        })
        .select()
        .single();

      if (dealError) {
        logger.error("Leads", "Failed to create deal from lead", dealError);
      } else {
        deal = dealData;
      }
    }

    // Update lead as converted
    await supabase
      .from("leads")
      .update({
        status: "qualified",
        converted_contact_id: contact.id,
        converted_deal_id: deal?.id || null,
        converted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("team_id", context.teamId);

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        lead_id: id,
        contact_id: contact.id,
        deal_id: deal?.id || null,
        type: "lead_converted",
        title: `Lead converted: ${lead.first_name} ${lead.last_name || ""}`.trim(),
      });
    } catch (e) { logger.warn("Leads", "Failed to log activity", e); }

    return NextResponse.json({
      success: true,
      data: { contact, deal },
    });
  } catch (error) {
    logger.error("Leads", "Convert error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
