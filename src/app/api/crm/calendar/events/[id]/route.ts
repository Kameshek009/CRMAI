import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { updateCalendarEventSchema } from "@/lib/calendar/validation";
import { getOAuthConnection, getValidAccessToken } from "@/lib/oauth/tokens";
import {
  deleteGoogleEvent,
  updateGoogleEvent,
} from "@/lib/calendar/google";
import { enqueueOrLog } from "@/lib/outbox/enqueue";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  { permission: { resource: "tasks", action: "read" }, logTag: "Calendar" },
  async (_request, ctx, { routeParams }) => {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", routeParams.id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (error || !data) throw new ApiError("Event not found", 404);
    return NextResponse.json({ success: true, data });
  },
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "tasks", action: "update" },
    bodySchema: updateCalendarEventSchema,
    logTag: "Calendar",
  },
  async (_request, ctx, { body, routeParams }) => {
    const supabase = createSupabaseAdmin();
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", routeParams.id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!existing) throw new ApiError("Event not found", 404);

    if (existing.provider === "google" && existing.provider_event_id) {
      const connection = await getOAuthConnection(ctx.workspaceId, "google");
      if (connection) {
        try {
          const accessToken = await getValidAccessToken(connection);
          await updateGoogleEvent(accessToken, existing.provider_event_id, {
            summary: body.title ?? undefined,
            description: body.description ?? undefined,
            location: body.location ?? undefined,
            start: body.starts_at
              ? body.all_day
                ? { date: body.starts_at.slice(0, 10) }
                : { dateTime: body.starts_at }
              : undefined,
            end: body.ends_at
              ? body.all_day
                ? { date: body.ends_at.slice(0, 10) }
                : { dateTime: body.ends_at }
              : undefined,
            attendees: body.attendees?.map((a) => ({
              email: a.email,
              displayName: a.name ?? undefined,
              optional: a.optional ?? false,
            })),
            calendarId: existing.provider_calendar_id ?? "primary",
          });
        } catch (e) {
          logger.warn("Calendar", "Google sync on update failed", e);
        }
      }
    }

    const updatePayload: Record<string, unknown> = {};
    for (const k of [
      "title",
      "description",
      "location",
      "starts_at",
      "ends_at",
      "all_day",
      "attendees",
      "contact_id",
      "lead_id",
      "deal_id",
    ] as const) {
      if (body[k] !== undefined) updatePayload[k] = body[k];
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .update(updatePayload)
      .eq("id", routeParams.id)
      .eq("team_id", ctx.workspaceId)
      .select("*")
      .single();
    if (error || !data) throw new ApiError("Failed to update", 500);

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: "calendar.event_updated",
      entityType: "calendar_event",
      entityId: data.id,
    });

    return NextResponse.json({ success: true, data });
  },
);

export const DELETE = withApiHandler(
  { permission: { resource: "tasks", action: "delete" }, logTag: "Calendar" },
  async (_request, ctx, { routeParams }) => {
    const supabase = createSupabaseAdmin();
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", routeParams.id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!existing) throw new ApiError("Event not found", 404);

    if (existing.provider === "google" && existing.provider_event_id) {
      const connection = await getOAuthConnection(ctx.workspaceId, "google");
      if (connection) {
        try {
          const accessToken = await getValidAccessToken(connection);
          await deleteGoogleEvent(
            accessToken,
            existing.provider_event_id,
            existing.provider_calendar_id ?? "primary",
          );
        } catch (e) {
          logger.warn("Calendar", "Google sync on delete failed", e);
        }
      }
    }

    await supabase
      .from("calendar_events")
      .update({ is_deleted: true })
      .eq("id", routeParams.id)
      .eq("team_id", ctx.workspaceId);

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: "calendar.event_deleted",
      entityType: "calendar_event",
      entityId: existing.id,
    });

    return NextResponse.json({ success: true });
  },
);
