import { describe, it, expect } from "vitest";
import {
  googleEventToRow,
  googleTimesToRow,
} from "@/lib/calendar/google";
import type { GoogleEvent } from "@/lib/calendar/google";

describe("calendar/google mappers", () => {
  describe("googleTimesToRow", () => {
    it("returns ISO and all_day=false for dateTime events", () => {
      const r = googleTimesToRow({
        id: "x",
        start: { dateTime: "2026-05-17T10:00:00-07:00" },
        end: { dateTime: "2026-05-17T11:00:00-07:00" },
      } as GoogleEvent);
      expect(r?.all_day).toBe(false);
      expect(r?.starts_at).toMatch(/T\d/);
      expect(new Date(r!.ends_at).getTime()).toBeGreaterThan(new Date(r!.starts_at).getTime());
    });

    it("returns midnight-UTC and all_day=true for date events", () => {
      const r = googleTimesToRow({
        id: "x",
        start: { date: "2026-05-17" },
        end: { date: "2026-05-18" },
      } as GoogleEvent);
      expect(r?.all_day).toBe(true);
      expect(r?.starts_at).toBe("2026-05-17T00:00:00.000Z");
      expect(r?.ends_at).toBe("2026-05-18T00:00:00.000Z");
    });

    it("returns null when start/end missing", () => {
      expect(googleTimesToRow({ id: "x" } as GoogleEvent)).toBeNull();
    });

    it("returns null when only date on one side", () => {
      expect(
        googleTimesToRow({
          id: "x",
          start: { date: "2026-05-17" },
          end: { dateTime: "2026-05-17T11:00:00Z" },
        } as GoogleEvent),
      ).toBeNull();
    });
  });

  describe("googleEventToRow", () => {
    it("flattens a typical event", () => {
      const row = googleEventToRow({
        teamId: "team-1",
        accountId: "acc-1",
        calendarId: "primary",
        event: {
          id: "g-1",
          summary: "Standup",
          description: "Daily sync",
          location: "Zoom",
          status: "confirmed",
          start: { dateTime: "2026-05-17T10:00:00Z" },
          end: { dateTime: "2026-05-17T10:15:00Z" },
          attendees: [
            { email: "ALICE@x.com", displayName: "Alice", responseStatus: "accepted" },
            { email: "Bob@y.com", optional: true },
          ],
          iCalUID: "ical-1",
          htmlLink: "https://cal.google/x",
        },
      });
      expect(row).toMatchObject({
        team_id: "team-1",
        account_id: "acc-1",
        provider: "google",
        provider_event_id: "g-1",
        provider_calendar_id: "primary",
        title: "Standup",
        description: "Daily sync",
        location: "Zoom",
        all_day: false,
        status: "confirmed",
        is_deleted: false,
      });
      expect(row?.attendees).toEqual([
        { email: "alice@x.com", name: "Alice", response_status: "accepted", optional: false },
        { email: "bob@y.com", name: null, response_status: "needsAction", optional: true },
      ]);
    });

    it("marks cancelled events with is_deleted=true", () => {
      const row = googleEventToRow({
        teamId: "t",
        accountId: "a",
        calendarId: "primary",
        event: {
          id: "g-2",
          status: "cancelled",
          start: { dateTime: "2026-05-17T10:00:00Z" },
          end: { dateTime: "2026-05-17T10:15:00Z" },
        },
      });
      expect(row?.is_deleted).toBe(true);
      expect(row?.status).toBe("cancelled");
    });

    it("returns null when times malformed", () => {
      const row = googleEventToRow({
        teamId: "t",
        accountId: "a",
        calendarId: "primary",
        event: { id: "g-3" },
      });
      expect(row).toBeNull();
    });

    it("preserves empty attendees list", () => {
      const row = googleEventToRow({
        teamId: "t",
        accountId: "a",
        calendarId: "primary",
        event: {
          id: "g-4",
          start: { dateTime: "2026-05-17T10:00:00Z" },
          end: { dateTime: "2026-05-17T11:00:00Z" },
        },
      });
      expect(row?.attendees).toEqual([]);
    });
  });
});
