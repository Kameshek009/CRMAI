import type { SupabaseClient } from "@supabase/supabase-js";

export interface OutboxEventInput {
  teamId: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Append an event to the outbox. Call this from the same transaction as the
 * domain write — at the application layer that means: write the domain row,
 * then immediately enqueue, both via service_role on Supabase. We do not
 * use a Postgres transaction wrapper here because supabase-js does not
 * expose explicit transactions; the trade-off is that a process death
 * between the two writes loses the event. Critical paths should use a
 * Postgres function with both inserts.
 */
export async function enqueueOutboxEvent(
  supabase: SupabaseClient,
  input: OutboxEventInput,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("outbox_events")
    .insert({
      team_id: input.teamId,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? {},
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "insert_failed" };
  return { id: data.id };
}
