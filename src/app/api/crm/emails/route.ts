import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createEmailSchema } from "@/lib/crm/validation";
import { parsePagination } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/send";

export const GET = withApiHandler(
  {
    permission: { resource: "contacts", action: "read" },
    logTag: "Emails",
  },
  async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);
    const contactId = searchParams.get("contact_id");
    const dealId = searchParams.get("deal_id");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("email_communications")
      .select("*", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (contactId) query = query.eq("contact_id", contactId);
    if (dealId) query = query.eq("deal_id", dealId);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Failed to fetch emails", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "create" },
    bodySchema: createEmailSchema,
    logTag: "Emails",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();

    // Outbound: try to actually deliver via Resend. sendEmail() owns the
    // INSERT into email_communications so we don't double-write the row.
    if (body.direction === "outbound") {
      const result = await sendEmail(supabase, {
        teamId: ctx.workspaceId,
        accountId: ctx.accountId,
        contactId: body.contact_id ?? null,
        dealId: body.deal_id ?? null,
        from: body.from_email,
        to: body.to_emails ?? [],
        cc: body.cc_emails ?? undefined,
        bcc: body.bcc_emails ?? undefined,
        subject: body.subject ?? "(no subject)",
        text: body.body_text ?? undefined,
        html: body.body_html ?? undefined,
      });

      try {
        await supabase.from("crm_activities").insert({
          account_id: ctx.accountId,
          team_id: ctx.workspaceId,
          contact_id: body.contact_id || null,
          deal_id: body.deal_id || null,
          type: "email",
          title: `Email: ${body.subject || "(no subject)"}`,
          description: body.body_text?.slice(0, 200) || null,
        });
      } catch (e) { logger.error("Emails", "Failed to log activity", e); }

      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error, data: result.id ? { id: result.id } : null },
          { status: 502 },
        );
      }
      return NextResponse.json({
        success: true,
        data: { id: result.id, provider_message_id: result.providerMessageId },
      });
    }

    // Inbound: legacy path — just log the row, no provider interaction.
    const { data, error: dbError } = await supabase
      .from("email_communications")
      .insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        ...body,
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create email", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: body.contact_id || null,
        deal_id: body.deal_id || null,
        type: "email",
        title: `Email: ${body.subject || "(no subject)"}`,
        description: body.body_text?.slice(0, 200) || null,
      });
    } catch (e) { logger.error("Emails", "Failed to log activity", e); }

    // Inbound email exits any active sequence enrollments for this contact.
    try {
      const contactId = body.contact_id;
      if (contactId) {
        await supabase
          .from("email_sequence_enrollments")
          .update({ status: "exited_reply", updated_at: new Date().toISOString() })
          .eq("status", "active")
          .eq("contact_id", contactId);
      }
    } catch (e) { logger.error("Emails", "Failed to exit sequence enrollments", e); }

    return NextResponse.json({ success: true, data });
  }
);
