import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

type ChannelCallback = (payload: unknown) => void;
const channelMocks: Array<{
  name: string;
  callbacks: ChannelCallback[];
  subscribed: boolean;
  removed: boolean;
}> = [];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    channel(name: string) {
      const channel = { name, callbacks: [] as ChannelCallback[], subscribed: false, removed: false };
      channelMocks.push(channel);
      const api: Record<string, unknown> = {};
      api.on = (_event: string, _filter: unknown, cb: ChannelCallback) => {
        channel.callbacks.push(cb);
        return api;
      };
      api.subscribe = () => {
        channel.subscribed = true;
        return api;
      };
      (api as Record<string, unknown>).__channel = channel;
      return api;
    },
    removeChannel(api: { __channel: { removed: boolean } }) {
      if (api && api.__channel) api.__channel.removed = true;
    },
  },
}));

import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";

describe("useRealtimeTable", () => {
  beforeEach(() => {
    channelMocks.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not subscribe while filterValue is undefined", () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "leads", filterValue: undefined, onChange }));
    expect(channelMocks).toHaveLength(0);
  });

  it("subscribes once on mount with INSERT/UPDATE/DELETE listeners by default", () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "leads", filterValue: "team-1", onChange }));
    expect(channelMocks).toHaveLength(1);
    expect(channelMocks[0]?.subscribed).toBe(true);
    expect(channelMocks[0]?.callbacks).toHaveLength(3);
  });

  it("debounces multiple rapid events into a single onChange", () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "leads", filterValue: "team-1", onChange, debounceMs: 300 }));
    const cb = channelMocks[0]?.callbacks[0];
    expect(cb).toBeDefined();

    cb!({});
    cb!({});
    cb!({});

    vi.advanceTimersByTime(299);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("respects custom events list", () => {
    renderHook(() =>
      useRealtimeTable({
        table: "leads",
        filterValue: "team-1",
        events: ["UPDATE", "DELETE"],
        onChange: vi.fn(),
      }),
    );
    expect(channelMocks[0]?.callbacks).toHaveLength(2);
  });

  it("removes the channel on unmount", () => {
    const { unmount } = renderHook(() =>
      useRealtimeTable({ table: "leads", filterValue: "team-1", onChange: vi.fn() }),
    );
    expect(channelMocks[0]?.removed).toBe(false);
    unmount();
    expect(channelMocks[0]?.removed).toBe(true);
  });

  it("calls the latest onChange even when the closure was created before re-render", () => {
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = renderHook(({ on }: { on: () => void }) =>
      useRealtimeTable({ table: "leads", filterValue: "team-1", onChange: on }),
      { initialProps: { on: a } },
    );
    rerender({ on: b });
    const cb = channelMocks[0]?.callbacks[0];
    cb!({});
    vi.advanceTimersByTime(400);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
