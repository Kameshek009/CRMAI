import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CallTimerProvider, useCallTimer } from "@/contexts/call-timer-context";
import React from "react";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CallTimerProvider>{children}</CallTimerProvider>
);

describe("useCallTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should have correct initial state", () => {
    const { result } = renderHook(() => useCallTimer(), { wrapper });

    expect(result.current.state).toEqual({
      isActive: false,
      callLogId: null,
      phoneNumber: null,
      contactName: null,
      startTime: null,
      elapsedSeconds: 0,
      showPostCall: false,
    });
  });

  it("should start call with correct params including contactName", () => {
    const { result } = renderHook(() => useCallTimer(), { wrapper });

    act(() => {
      result.current.startCall({
        callLogId: "call-123",
        phoneNumber: "+1234567890",
        contactName: "John Doe",
      });
    });

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.callLogId).toBe("call-123");
    expect(result.current.state.phoneNumber).toBe("+1234567890");
    expect(result.current.state.contactName).toBe("John Doe");
    expect(result.current.state.startTime).not.toBeNull();
    expect(result.current.state.elapsedSeconds).toBe(0);
    expect(result.current.state.showPostCall).toBe(false);
  });

  it("should start call without contactName and set it to null", () => {
    const { result } = renderHook(() => useCallTimer(), { wrapper });

    act(() => {
      result.current.startCall({
        callLogId: "call-456",
        phoneNumber: "+9876543210",
      });
    });

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.callLogId).toBe("call-456");
    expect(result.current.state.phoneNumber).toBe("+9876543210");
    expect(result.current.state.contactName).toBeNull();
    expect(result.current.state.startTime).not.toBeNull();
    expect(result.current.state.elapsedSeconds).toBe(0);
    expect(result.current.state.showPostCall).toBe(false);
  });

  it("should end call and set showPostCall to true", () => {
    const { result } = renderHook(() => useCallTimer(), { wrapper });

    act(() => {
      result.current.startCall({
        callLogId: "call-789",
        phoneNumber: "+1111111111",
        contactName: "Jane Smith",
      });
    });

    act(() => {
      result.current.endCall();
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.showPostCall).toBe(true);
    expect(result.current.state.callLogId).toBe("call-789");
    expect(result.current.state.phoneNumber).toBe("+1111111111");
    expect(result.current.state.contactName).toBe("Jane Smith");
  });

  it("should cancel call and reset to initial state", () => {
    const { result } = renderHook(() => useCallTimer(), { wrapper });

    act(() => {
      result.current.startCall({
        callLogId: "call-999",
        phoneNumber: "+2222222222",
        contactName: "Test User",
      });
    });

    act(() => {
      result.current.cancelCall();
    });

    expect(result.current.state).toEqual({
      isActive: false,
      callLogId: null,
      phoneNumber: null,
      contactName: null,
      startTime: null,
      elapsedSeconds: 0,
      showPostCall: false,
    });
  });

  it("should dismiss post call and reset to initial state", () => {
    const { result } = renderHook(() => useCallTimer(), { wrapper });

    act(() => {
      result.current.startCall({
        callLogId: "call-888",
        phoneNumber: "+3333333333",
        contactName: "Another User",
      });
    });

    act(() => {
      result.current.endCall();
    });

    expect(result.current.state.showPostCall).toBe(true);

    act(() => {
      result.current.dismissPostCall();
    });

    expect(result.current.state).toEqual({
      isActive: false,
      callLogId: null,
      phoneNumber: null,
      contactName: null,
      startTime: null,
      elapsedSeconds: 0,
      showPostCall: false,
    });
  });

  it("should increment elapsedSeconds when timer is running", () => {
    const { result } = renderHook(() => useCallTimer(), { wrapper });

    act(() => {
      result.current.startCall({
        callLogId: "call-777",
        phoneNumber: "+4444444444",
        contactName: "Timer Test",
      });
    });

    expect(result.current.state.elapsedSeconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.state.elapsedSeconds).toBe(3);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state.elapsedSeconds).toBe(5);
  });

  it("should throw error when useCallTimer is used outside provider", () => {
    expect(() => {
      renderHook(() => useCallTimer());
    }).toThrow("useCallTimer must be used within CallTimerProvider");
  });
});
