import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createCallLogSchema } from "@/lib/crm/validation";
import { findContactByPhone } from "@/lib/whatsapp/helpers";
import { logger } from "@/lib/logger";
import { createTeamNotification } from "@/lib/crm/notifications";

export const GET = withApiHandler(
  {
    permission: { resource: "call_logs", action: "read" },
    logTag: "CallLogs",
  },
  async (request, ctx) => {
    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("call_logs")
      .select("*, contacts(id, first_name, last_name)", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "call_logs", params, ["from_number", "to_number", "summary"]);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Failed to fetch call logs", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "call_logs", action: "create" },
    bodySchema: createCallLogSchema,
    logTag: "CallLogs",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();

    // Auto-find or create contact by phone number if contact_id not provided
    let contactId = body.contact_id || null;
    const phoneNumber = body.to_number || body.from_number;
    if (!contactId && phoneNumber) {
      contactId = await findContactByPhone(ctx.workspaceId, phoneNumber);
      if (!contactId) {
        const { data: newContact } = await supabase
          .from("contacts")
          .insert({
            team_id: ctx.workspaceId,
            account_id: ctx.accountId,
            first_name: phoneNumber,
            phone: phoneNumber,
            source: "call",
          })
          .select("id")
          .single();
        if (newContact) {
          contactId = newContact.id;

          // Notify all team members
          createTeamNotification({
            teamId: ctx.workspaceId,
            type: "new_contact_call",
            title: `New contact from call: ${phoneNumber}`,
            message: phoneNumber,
            entityType: "contact",
            entityId: newContact.id,
          });
        }
      }
    }

    const { data, error: dbError } = await supabase
      .from("call_logs")
      .insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        caller_account_id: ctx.accountId,
        ...body,
        contact_id: contactId,
      })
      .select("*, contacts(id, first_name, last_name)")
      .single();

    if (dbError) throw new ApiError("Failed to create call log", 500);

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: contactId,
        deal_id: body.deal_id || null,
        type: "call",
        title: `${body.direction === "inbound" ? "Inbound" : "Outbound"} call${body.status ? ` — ${body.status}` : ""}`,
        description: body.summary?.slice(0, 200) || null,
      });
    } catch (e) { logger.error("CallLogs", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);
