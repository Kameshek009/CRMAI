import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useDebounce } from "@/hooks/use-debounce";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDebounce", () => {
  it("returns the initial value immediately", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update before the delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );

    rerender({ value: "b", delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe("a");
  });

  it("updates after the delay has elapsed", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );

    rerender({ value: "b", delay: 300 });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("b");
  });

  it("resets the timer when value changes before delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );

    rerender({ value: "b", delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe("a");

    rerender({ value: "c", delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });
    // Still "a" because timer was reset
    expect(result.current).toBe("a");

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe("c");
  });

  it("does not fire if value stays the same", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "stable", delay: 300 } }
    );

    rerender({ value: "stable", delay: 300 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe("stable");
  });
});
