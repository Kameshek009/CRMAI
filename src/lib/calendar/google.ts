/**
 * Google Calendar API v3 client. Mirrors the pattern of `inbox/gmail.ts`:
 * thin fetch wrappers + a higher-level `syncCalendar` that pulls the latest
 * delta into `calendar_events`.
 *
 * Watch lifecycle:
 *   - events.watch sets up an HTTP push channel (Google → our webhook), TTL 7d
 *   - X-Goog-Channel-Token header is our per-channel secret — verified on push
 *   - On push we don't read the body; we just call events.list with syncToken
 *
 * Sync semantics:
 *   - First time: events.list with no syncToken → use timeMin to bound, save
 *     final nextSyncToken
 *   - Subsequent: events.list with syncToken → upserts + new syncToken
 *   - When syncToken returns 410 Gone → full resync
 */

import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getOAuthConnection, getValidAccessToken } from "@/lib/oauth/tokens";
import type { OAuthConnectionRow } from "@/lib/oauth/tokens";
import { logger } from "@/lib/logger";

const CAL_BASE = "https://www.googleapis.com/calendar/v3";

async function authedFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${CAL_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// ─── Watch channels ────────────────────────────────────────────────────────

export interface CalendarChannelInput {
  /** Unique channel ID we generate; persisted so we can resolve push → workspace. */
  channelId: string;
  /** Our verification token, also returned in X-Goog-Channel-Token. */
  token: string;
  /** Full HTTPS URL Google should POST to. */
  webhookUrl: string;
  /** Channel TTL in seconds; Google caps at 604800 (7d). */
  ttlSeconds?: number;
  /** Calendar ID; default 'primary' (the connected user's main calendar). */
  calendarId?: string;
}

export interface CalendarChannelResult {
  channelId: string;
  resourceId: string;
  expiration: string; // ms-since-epoch as string
}

interface RawChannelResponse {
  id: string;
  resourceId: string;
  expiration: string;
}

export async function startCalendarChannel(
  accessToken: string,
  input: CalendarChannelInput,
): Promise<CalendarChannelResult> {
  const calendar = encodeURIComponent(input.calendarId ?? "primary");
  const expirationMs = Date.now() + (input.ttlSeconds ?? 7 * 24 * 60 * 60) * 1000;
  const res = await authedFetch(accessToken, `/calendars/${calendar}/events/watch`, {
    method: "POST",
    body: JSON.stringify({
      id: input.channelId,
      type: "web_hook",
      address: input.webhookUrl,
      token: input.token,
      expiration: String(expirationMs),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`calendar.events.watch failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawChannelResponse;
  return { channelId: json.id, resourceId: json.resourceId, expiration: json.expiration };
}

export async function stopCalendarChannel(
  accessToken: string,
  channelId: string,
  resourceId: string,
): Promise<void> {
  const res = await authedFetch(accessToken, `/channels/stop`, {
    method: "POST",
    body: JSON.stringify({ id: channelId, resourceId }),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`calendar.channels.stop failed (${res.status}): ${text}`);
  }
}

// ─── Events list / get / mutate ───────────────────────────────────────────

export interface GoogleEvent {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
    optional?: boolean;
    organizer?: boolean;
  }>;
  created?: string;
  updated?: string;
  iCalUID?: string;
  htmlLink?: string;
}

export interface ListEventsOptions {
  calendarId?: string;
  syncToken?: string;
  pageToken?: string;
  timeMin?: string;
  timeMax?: string;
  showDeleted?: boolean;
  maxResults?: number;
}

export interface ListEventsResponse {
  items: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export async function listGoogleEvents(
  accessToken: string,
  options: ListEventsOptions = {},
): Promise<ListEventsResponse> {
  const calendar = encodeURIComponent(options.calendarId ?? "primary");
  const params = new URLSearchParams();
  if (options.syncToken) {
    params.set("syncToken", options.syncToken);
    // syncToken disallows most other filters; keep showDeleted=true so we see cancellations.
    params.set("showDeleted", "true");
  } else {
    if (options.timeMin) params.set("timeMin", options.timeMin);
    if (options.timeMax) params.set("timeMax", options.timeMax);
    params.set("showDeleted", options.showDeleted ? "true" : "false");
  }
  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.maxResults) params.set("maxResults", String(options.maxResults));
  params.set("singleEvents", "true");

  const res = await authedFetch(accessToken, `/calendars/${calendar}/events?${params.toString()}`);
  if (res.status === 410) {
    throw new Error("calendar.sync.expired");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`calendar.events.list failed (${res.status}): ${text}`);
  }
  return (await res.json()) as ListEventsResponse;
}

export interface InsertEventInput {
  calendarId?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; optional?: boolean }>;
}

export async function insertGoogleEvent(
  accessToken: string,
  input: InsertEventInput,
): Promise<GoogleEvent> {
  const calendar = encodeURIComponent(input.calendarId ?? "primary");
  const { calendarId: _ignored, ...body } = input;
  const res = await authedFetch(accessToken, `/calendars/${calendar}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`calendar.events.insert failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleEvent;
}

export async function updateGoogleEvent(
  accessToken: string,
  eventId: string,
  input: Partial<InsertEventInput>,
): Promise<GoogleEvent> {
  const calendar = encodeURIComponent(input.calendarId ?? "primary");
  const { calendarId: _ignored, ...body } = input;
  const res = await authedFetch(accessToken, `/calendars/${calendar}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`calendar.events.update failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleEvent;
}

export async function deleteGoogleEvent(
  accessToken: string,
  eventId: string,
  calendarId?: string,
): Promise<void> {
  const calendar = encodeURIComponent(calendarId ?? "primary");
  const res = await authedFetch(accessToken, `/calendars/${calendar}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text().catch(() => "");
    throw new Error(`calendar.events.delete failed (${res.status}): ${text}`);
  }
}

// ─── Mapping helpers ──────────────────────────────────────────────────────

export interface EventTimes {
  starts_at: string;
  ends_at: string;
  all_day: boolean;
}

/**
 * Convert Google's `start`/`end` to our schema:
 *   - `date` (all-day) → midnight UTC of that date for start, +1d for end
 *   - `dateTime` → that ISO string normalised through Date
 */
export function googleTimesToRow(event: GoogleEvent): EventTimes | null {
  const s = event.start;
  const e = event.end;
  if (!s || !e) return null;
  if (s.dateTime && e.dateTime) {
    return {
      starts_at: new Date(s.dateTime).toISOString(),
      ends_at: new Date(e.dateTime).toISOString(),
      all_day: false,
    };
  }
  if (s.date && e.date) {
    return {
      starts_at: new Date(`${s.date}T00:00:00Z`).toISOString(),
      ends_at: new Date(`${e.date}T00:00:00Z`).toISOString(),
      all_day: true,
    };
  }
  return null;
}

export function googleEventToRow(args: {
  teamId: string;
  accountId: string;
  event: GoogleEvent;
  calendarId: string;
}): Record<string, unknown> | null {
  const times = googleTimesToRow(args.event);
  if (!times) return null;
  return {
    team_id: args.teamId,
    account_id: args.accountId,
    provider: "google" as const,
    provider_event_id: args.event.id,
    provider_calendar_id: args.calendarId,
    title: args.event.summary ?? null,
    description: args.event.description ?? null,
    location: args.event.location ?? null,
    starts_at: times.starts_at,
    ends_at: times.ends_at,
    all_day: times.all_day,
    attendees: (args.event.attendees ?? []).map((a) => ({
      email: (a.email ?? "").toLowerCase(),
      name: a.displayName ?? null,
      response_status: a.responseStatus ?? "needsAction",
      optional: a.optional ?? false,
    })),
    status: args.event.status ?? "confirmed",
    metadata: {
      iCalUID: args.event.iCalUID ?? null,
      htmlLink: args.event.htmlLink ?? null,
    },
    is_deleted: args.event.status === "cancelled",
  };
}

// ─── Sync orchestration ───────────────────────────────────────────────────

export interface CalendarSyncState {
  channel_id: string;
  resource_id: string;
  token: string;
  expiration: string;
  sync_token: string | null;
  calendar_id: string;
  started_at: string;
}

export async function persistCalendarState(
  connectionId: string,
  state: CalendarSyncState,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("oauth_tokens")
    .select("metadata")
    .eq("id", connectionId)
    .single();
  const metadata = { ...(row?.metadata ?? {}), calendar: state };
  await supabase.from("oauth_tokens").update({ metadata }).eq("id", connectionId);
}

/**
 * Sync the calendar for `connection`. If `state.sync_token` exists we run a
 * delta; otherwise we do a first-time bounded backfill (default ±90 days).
 * Persists `nextSyncToken` on success.
 */
export async function syncGoogleCalendar(args: {
  connection: OAuthConnectionRow;
  calendarId?: string;
}): Promise<{ upserted: number; deleted: number; sync_token: string | null }> {
  const { connection } = args;
  const calendarId = args.calendarId ?? "primary";
  const accessToken = await getValidAccessToken(connection);
  const supabase = createSupabaseAdmin();
  const metadata = (connection.metadata ?? {}) as { calendar?: CalendarSyncState };
  let syncToken: string | undefined = metadata.calendar?.sync_token ?? undefined;

  const baseOptions: ListEventsOptions = syncToken
    ? { calendarId, syncToken }
    : {
        calendarId,
        timeMin: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        showDeleted: true,
      };

  let upserted = 0;
  let deleted = 0;
  let nextSyncToken: string | null = null;
  let pageToken: string | undefined;

  for (let i = 0; i < 20; i++) {
    let resp: ListEventsResponse;
    try {
      resp = await listGoogleEvents(accessToken, { ...baseOptions, pageToken });
    } catch (e) {
      if (e instanceof Error && e.message === "calendar.sync.expired") {
        // 410: token too old. Drop syncToken and re-run as backfill.
        metadata.calendar = { ...(metadata.calendar as CalendarSyncState), sync_token: null };
        await persistCalendarState(connection.id, metadata.calendar as CalendarSyncState);
        syncToken = undefined;
        return syncGoogleCalendar(args);
      }
      throw e;
    }
    for (const ev of resp.items) {
      const row = googleEventToRow({
        teamId: connection.team_id,
        accountId: connection.account_id,
        event: ev,
        calendarId,
      });
      if (!row) continue;
      const { error } = await supabase
        .from("calendar_events")
        .upsert(row, { onConflict: "provider,provider_event_id" });
      if (error) {
        logger.error("CalendarSync", "upsert failed", { event_id: ev.id, error });
        continue;
      }
      if (ev.status === "cancelled") deleted++;
      else upserted++;
    }
    if (resp.nextPageToken) {
      pageToken = resp.nextPageToken;
      continue;
    }
    nextSyncToken = resp.nextSyncToken ?? null;
    break;
  }

  if (nextSyncToken) {
    const current = (metadata.calendar ?? {}) as CalendarSyncState;
    await persistCalendarState(connection.id, {
      ...current,
      sync_token: nextSyncToken,
      calendar_id: calendarId,
    });
  }
  return { upserted, deleted, sync_token: nextSyncToken };
}

/**
 * Ensure a push channel exists for `team_id`'s Google connection. Idempotent
 * — if a non-expired channel is already stored, this is a no-op. Otherwise
 * it issues `events.watch` and persists the state.
 */
export async function ensureCalendarChannel(args: {
  teamId: string;
}): Promise<CalendarSyncState | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    logger.warn("CalendarSync", "NEXT_PUBLIC_APP_URL not set — skipping channel");
    return null;
  }
  const connection = await getOAuthConnection(args.teamId, "google");
  if (!connection) return null;
  const accessToken = await getValidAccessToken(connection);
  const metadata = (connection.metadata ?? {}) as { calendar?: CalendarSyncState };
  const now = Date.now();
  if (
    metadata.calendar?.channel_id &&
    metadata.calendar?.expiration &&
    Date.parse(metadata.calendar.expiration) > now + 2 * 24 * 60 * 60 * 1000
  ) {
    return metadata.calendar;
  }

  // Stop any old channel best-effort.
  if (metadata.calendar?.channel_id && metadata.calendar.resource_id) {
    try {
      await stopCalendarChannel(accessToken, metadata.calendar.channel_id, metadata.calendar.resource_id);
    } catch (e) {
      logger.warn("CalendarSync", "stop old channel failed (continuing)", e);
    }
  }

  const channelId = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("base64url");
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/google/calendar`;
  const result = await startCalendarChannel(accessToken, {
    channelId,
    token,
    webhookUrl,
    calendarId: "primary",
  });
  const state: CalendarSyncState = {
    channel_id: result.channelId,
    resource_id: result.resourceId,
    token,
    expiration: new Date(Number(result.expiration)).toISOString(),
    sync_token: metadata.calendar?.sync_token ?? null,
    calendar_id: "primary",
    started_at: new Date().toISOString(),
  };
  await persistCalendarState(connection.id, state);
  // Kick off a first sync so we land any pre-existing events.
  try {
    await syncGoogleCalendar({ connection: { ...connection, metadata: { ...connection.metadata, calendar: state } } });
  } catch (e) {
    logger.warn("CalendarSync", "initial sync failed (channel still active)", e);
  }
  return state;
}
