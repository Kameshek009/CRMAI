import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAgentStatus } from "@/hooks/use-agent-status";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  close() {}

  // Helper to simulate events
  simulateEvent(type: string, data: unknown) {
    const handlers = this.listeners[type] || [];
    handlers.forEach((h) => h({ data: JSON.stringify(data) } as MessageEvent));
  }
}

const successResponse = {
  json: () =>
    Promise.resolve({
      success: true,
      data: {
        online: true,
        mode: "agent",
        lastSeen: "2026-02-26T10:00:00Z",
        version: "1.0.0",
      },
    }),
};

describe("useAgentStatus", () => {
  const originalEventSource = global.EventSource;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    MockEventSource.instances = [];
    global.EventSource = MockEventSource as unknown as typeof EventSource;

    fetchMock = vi.fn().mockResolvedValue(successResponse);
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.EventSource = originalEventSource;
  });

  it("initial state: isLoading=true, isOnline=false, mode='chat'", () => {
    // Never-resolving fetch to capture initial state
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAgentStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOnline).toBe(false);
    expect(result.current.mode).toBe("chat");
    expect(result.current.lastSeen).toBeNull();
    expect(result.current.version).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("after successful fetch: updates status, isLoading=false", async () => {
    const { result } = renderHook(() => useAgentStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.mode).toBe("agent");
    expect(result.current.lastSeen).toBe("2026-02-26T10:00:00Z");
    expect(result.current.version).toBe("1.0.0");
    expect(result.current.error).toBeNull();
  });

  it("fetch error: sets error, isLoading=false", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAgentStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
    expect(result.current.isOnline).toBe(false);
  });

  it("refetch: re-fetches status", async () => {
    const { result } = renderHook(() => useAgentStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Update mock response for the refetch
    fetchMock.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            online: false,
            mode: "chat",
            lastSeen: "2026-02-26T12:00:00Z",
            version: "2.0.0",
          },
        }),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.isOnline).toBe(false);
    expect(result.current.mode).toBe("chat");
    expect(result.current.version).toBe("2.0.0");
  });

  it("SSE status event: updates status in real-time", async () => {
    const { result } = renderHook(() => useAgentStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Get the last MockEventSource instance (created by the hook)
    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1];
    expect(eventSource).toBeDefined();
    expect(eventSource!.url).toBe("/api/agent/status/stream");

    // Simulate an SSE status event
    act(() => {
      eventSource!.simulateEvent("status", {
        online: false,
        mode: "auto",
        lastSeen: "2026-02-26T15:00:00Z",
        version: "3.0.0",
      });
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.mode).toBe("auto");
    expect(result.current.lastSeen).toBe("2026-02-26T15:00:00Z");
    expect(result.current.version).toBe("3.0.0");
    expect(result.current.error).toBeNull();
  });

  it("returns all expected properties", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAgentStatus());

    expect(result.current).toHaveProperty("isOnline");
    expect(result.current).toHaveProperty("mode");
    expect(result.current).toHaveProperty("lastSeen");
    expect(result.current).toHaveProperty("version");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(typeof result.current.refetch).toBe("function");
  });
});
