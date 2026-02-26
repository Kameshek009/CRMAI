import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { ensureDealStages } from "@/lib/crm/helpers";
import { logAudit } from "@/lib/crm/audit";
import { isValidUUID } from "@/lib/crm/helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const convertSchema = z.object({
  create_contact: z.boolean().default(true),
  create_deal: z.boolean().default(false),
  deal_title: z.string().max(200).optional(),
  deal_value: z.number().min(0).optional(),
  deal_stage_id: z.string().uuid().optional(),
});

export const POST = withApiHandler(
  {
    permission: { resource: "leads", action: "update" },
    bodySchema: convertSchema,
    logTag: "Leads",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Fetch lead
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    let contactId: string | null = null;
    let dealId: string | null = null;

    // Create contact
    if (body.create_contact) {
      const { data: contact, error: contactErr } = await supabase
        .from("contacts")
        .insert({
          account_id: ctx.accountId,
          team_id: ctx.workspaceId,
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
      if (contactErr || !contact) {
        logger.error("Leads", "Failed to create contact during conversion", contactErr);
        return NextResponse.json({ success: false, error: "Failed to create contact" }, { status: 500 });
      }
      contactId = contact.id;
    }

    // Create deal
    if (body.create_deal) {
      let stageId = body.deal_stage_id;
      if (!stageId) {
        await ensureDealStages(ctx.accountId, ctx.workspaceId);
        const { data: firstStage } = await supabase
          .from("deal_stages")
          .select("id")
          .eq("team_id", ctx.workspaceId)
          .order("position")
          .limit(1)
          .single();
        stageId = firstStage?.id;
      }
      if (stageId) {
        const { data: deal, error: dealErr } = await supabase
          .from("deals")
          .insert({
            account_id: ctx.accountId,
            team_id: ctx.workspaceId,
            title: body.deal_title || `${lead.first_name} ${lead.last_name || ""}`.trim(),
            value: body.deal_value || 0,
            stage_id: stageId,
            contact_id: contactId,
            status: "open",
          })
          .select()
          .single();
        if (dealErr || !deal) {
          // Rollback: delete the contact we just created
          if (contactId) {
            await supabase.from("contacts").delete().eq("id", contactId);
          }
          logger.error("Leads", "Failed to create deal during conversion", dealErr);
          return NextResponse.json({ success: false, error: "Failed to create deal" }, { status: 500 });
        }
        dealId = deal.id;
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
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
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
  }
);
