import { z } from "zod";

const attendeeSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
  optional: z.boolean().optional(),
});

export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  all_day: z.boolean().optional(),
  attendees: z.array(attendeeSchema).max(50).optional(),
  contact_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  /** When true, mirror the event to Google Calendar via events.insert. */
  sync_to_google: z.boolean().default(true),
}).refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
  message: "ends_at must be after starts_at",
  path: ["ends_at"],
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(20000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  all_day: z.boolean().optional(),
  attendees: z.array(attendeeSchema).max(50).optional(),
  contact_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
});

export const listCalendarEventsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  contact_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});
