import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { isValidUUID, ensureDealStages } from "@/lib/crm/helpers";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const convertSchema = z.object({
  create_contact: z.boolean().default(true),
  create_deal: z.boolean().default(false),
  deal_title: z.string().max(200).optional(),
  deal_value: z.number().min(0).optional(),
  deal_stage_id: z.string().uuid().optional(),
});

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
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Fetch lead
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    let contactId: string | null = null;
    let dealId: string | null = null;

    // Create contact
    if (parsed.data.create_contact) {
      const { data: contact } = await supabase
        .from("contacts")
        .insert({
          account_id: context.accountId,
          team_id: context.workspaceId,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          title: lead.job_title,
          status: "active",
          source: lead.source || "lead_conversion",
          tags: lead.tags,
        })
        .select()
        .single();
      contactId = contact?.id || null;
    }

    // Create deal
    if (parsed.data.create_deal) {
      let stageId = parsed.data.deal_stage_id;
      if (!stageId) {
        await ensureDealStages(context.accountId, context.workspaceId);
        const { data: firstStage } = await supabase
          .from("deal_stages")
          .select("id")
          .eq("team_id", context.workspaceId)
          .order("position")
          .limit(1)
          .single();
        stageId = firstStage?.id;
      }
      if (stageId) {
        const { data: deal } = await supabase
          .from("deals")
          .insert({
            account_id: context.accountId,
            team_id: context.workspaceId,
            title: parsed.data.deal_title || `${lead.first_name} ${lead.last_name || ""}`.trim(),
            value: parsed.data.deal_value || 0,
            stage_id: stageId,
            contact_id: contactId,
            status: "open",
          })
          .select()
          .single();
        dealId = deal?.id || null;
      }
    }

    // Mark lead as converted
    await supabase
      .from("leads")
      .update({
        status: "qualified",
        converted_contact_id: contactId,
        converted_deal_id: dealId,
        converted_at: new Date().toISOString(),
      })
      .eq("id", id);

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "lead",
      entityId: id,
      action: "update",
      changes: {
        converted: { old: false, new: true },
        contact_id: { old: null, new: contactId },
        deal_id: { old: null, new: dealId },
      },
    });

    return NextResponse.json({ success: true, data: { contact_id: contactId, deal_id: dealId } });
  } catch (err) {
    logger.error("Leads", "Convert error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
