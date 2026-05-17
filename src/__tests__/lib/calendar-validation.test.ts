import { describe, it, expect } from "vitest";
import {
  createCalendarEventSchema,
  listCalendarEventsQuerySchema,
  updateCalendarEventSchema,
} from "@/lib/calendar/validation";

describe("calendar/validation", () => {
  describe("createCalendarEventSchema", () => {
    it("accepts a minimal valid event", () => {
      const r = createCalendarEventSchema.safeParse({
        title: "Coffee",
        starts_at: "2026-05-17T10:00:00.000Z",
        ends_at: "2026-05-17T11:00:00.000Z",
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.sync_to_google).toBe(true);
    });

    it("rejects ends_at <= starts_at", () => {
      const r = createCalendarEventSchema.safeParse({
        title: "Coffee",
        starts_at: "2026-05-17T11:00:00.000Z",
        ends_at: "2026-05-17T10:00:00.000Z",
      });
      expect(r.success).toBe(false);
    });

    it("rejects empty title", () => {
      const r = createCalendarEventSchema.safeParse({
        title: "",
        starts_at: "2026-05-17T10:00:00.000Z",
        ends_at: "2026-05-17T11:00:00.000Z",
      });
      expect(r.success).toBe(false);
    });

    it("rejects more than 50 attendees", () => {
      const attendees = Array.from({ length: 51 }, (_, i) => ({ email: `u${i}@x.com` }));
      const r = createCalendarEventSchema.safeParse({
        title: "Big",
        starts_at: "2026-05-17T10:00:00.000Z",
        ends_at: "2026-05-17T11:00:00.000Z",
        attendees,
      });
      expect(r.success).toBe(false);
    });

    it("rejects malformed attendee email", () => {
      const r = createCalendarEventSchema.safeParse({
        title: "X",
        starts_at: "2026-05-17T10:00:00.000Z",
        ends_at: "2026-05-17T11:00:00.000Z",
        attendees: [{ email: "not-an-email" }],
      });
      expect(r.success).toBe(false);
    });

    it("accepts sync_to_google=false", () => {
      const r = createCalendarEventSchema.safeParse({
        title: "Local only",
        starts_at: "2026-05-17T10:00:00.000Z",
        ends_at: "2026-05-17T11:00:00.000Z",
        sync_to_google: false,
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.sync_to_google).toBe(false);
    });
  });

  describe("updateCalendarEventSchema", () => {
    it("accepts partial updates", () => {
      expect(updateCalendarEventSchema.safeParse({ title: "New" }).success).toBe(true);
      expect(updateCalendarEventSchema.safeParse({}).success).toBe(true);
    });
  });

  describe("listCalendarEventsQuerySchema", () => {
    it("coerces numeric limit from string", () => {
      const r = listCalendarEventsQuerySchema.safeParse({ limit: "25" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.limit).toBe(25);
    });

    it("rejects non-uuid contact_id", () => {
      const r = listCalendarEventsQuerySchema.safeParse({ contact_id: "abc" });
      expect(r.success).toBe(false);
    });
  });
});
