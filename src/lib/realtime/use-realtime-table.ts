"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

export type UseRealtimeTableOptions = {
  // Postgres table name in the `public` schema, e.g. "leads".
  table: string;
  // Filter column / value pair. Most CRM tables are partitioned by team_id;
  // detail pages can pass `{ filterColumn: "id", filterValue: leadId }`.
  filterColumn?: string;
  filterValue: string | undefined;
  // Defaults to INSERT + UPDATE + DELETE.
  events?: RealtimeEvent[];
  onChange: () => void;
  // Coalesce bursts of events into one onChange call. Default 300ms.
  debounceMs?: number;
};

// Subscribes to Supabase postgres_changes for the given table+filter and
// fires `onChange` (debounced) on every matching INSERT/UPDATE/DELETE.
// No-ops while filterValue is undefined so callers can mount the hook
// before the team_id / row_id is known.
export function useRealtimeTable({
  table,
  filterColumn = "team_id",
  filterValue,
  events,
  onChange,
  debounceMs = 300,
}: UseRealtimeTableOptions): void {
  // Keep onChange fresh without re-subscribing each render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const eventsKey = events ? events.slice().sort().join(",") : "INSERT,UPDATE,DELETE";

  useEffect(() => {
    if (!filterValue) return;

    const evts: RealtimeEvent[] = events ?? ["INSERT", "UPDATE", "DELETE"];

    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), debounceMs);
    };

    // Channel name must be unique per (table, filter, mount) — collisions
    // cause the Supabase client to reuse subscriptions across components.
    const channelName = `rt:${table}:${filterColumn}:${filterValue}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const channel = supabase.channel(channelName);
    // The .on() signature for postgres_changes is a discriminated union
    // narrowed by literal event name; calling it in a loop with a typed
    // variable is awkward. Cast to a permissive shape just here.
    const builder = channel as unknown as {
      on: (event: string, filter: unknown, cb: () => void) => unknown;
    };
    for (const ev of evts) {
      builder.on(
        "postgres_changes",
        {
          event: ev,
          schema: "public",
          table,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        fire,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
    // eventsKey collapses array identity into a stable string so callers
    // can pass an inline array without re-subscribing every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filterColumn, filterValue, debounceMs, eventsKey]);
}
