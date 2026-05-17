import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  createCalendarEventSchema,
  listCalendarEventsQuerySchema,
} from "@/lib/calendar/validation";
import { getOAuthConnection, getValidAccessToken } from "@/lib/oauth/tokens";
import { insertGoogleEvent } from "@/lib/calendar/google";
import { enqueueOrLog } from "@/lib/outbox/enqueue";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "tasks", action: "read" },
    querySchema: listCalendarEventsQuerySchema,
    logTag: "Calendar",
  },
  async (_request, ctx, { query }) => {
    const supabase = createSupabaseAdmin();
    let q = supabase
      .from("calendar_events")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .order("starts_at", { ascending: true });
    if (query.from) q = q.gte("starts_at", query.from);
    if (query.to) q = q.lte("starts_at", query.to);
    if (query.contact_id) q = q.eq("contact_id", query.contact_id);
    if (query.lead_id) q = q.eq("lead_id", query.lead_id);
    if (query.deal_id) q = q.eq("deal_id", query.deal_id);
    if (query.limit) q = q.limit(query.limit);

    const { data, error } = await q;
    if (error) throw new ApiError(`Failed to list events: ${error.message}`, 500);
    return NextResponse.json({ success: true, data });
  },
);

export const POST = withApiHandler(
  {
    permission: { resource: "tasks", action: "create" },
    bodySchema: createCalendarEventSchema,
    logTag: "Calendar",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();

    let providerEventId: string | null = null;
    let providerError: string | null = null;
    if (body.sync_to_google) {
      const connection = await getOAuthConnection(ctx.workspaceId, "google");
      if (connection) {
        try {
          const accessToken = await getValidAccessToken(connection);
          const ev = await insertGoogleEvent(accessToken, {
            summary: body.title,
            description: body.description ?? undefined,
            location: body.location ?? undefined,
            start: body.all_day
              ? { date: body.starts_at.slice(0, 10) }
              : { dateTime: body.starts_at },
            end: body.all_day
              ? { date: body.ends_at.slice(0, 10) }
              : { dateTime: body.ends_at },
            attendees: (body.attendees ?? []).map((a) => ({
              email: a.email,
              displayName: a.name ?? undefined,
              optional: a.optional ?? false,
            })),
          });
          providerEventId = ev.id;
        } catch (e) {
          providerError = e instanceof Error ? e.message : String(e);
          logger.warn("Calendar", "Google sync on create failed", e);
        }
      }
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        team_id: ctx.workspaceId,
        account_id: ctx.accountId,
        provider: providerEventId ? "google" : "local",
        provider_event_id: providerEventId,
        provider_calendar_id: providerEventId ? "primary" : null,
        title: body.title,
        description: body.description ?? null,
        location: body.location ?? null,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        all_day: body.all_day ?? false,
        attendees: body.attendees ?? [],
        contact_id: body.contact_id ?? null,
        lead_id: body.lead_id ?? null,
        deal_id: body.deal_id ?? null,
        metadata: providerError ? { provider_error: providerError } : {},
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new ApiError(`Failed to create event: ${error?.message ?? "unknown"}`, 500);
    }

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: "calendar.event_created",
      entityType: "calendar_event",
      entityId: data.id,
      payload: {
        provider: data.provider,
        provider_event_id: data.provider_event_id,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
      },
    });

    return NextResponse.json({ success: true, data });
  },
);
