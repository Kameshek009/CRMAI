import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function pressKey(key: string, options?: KeyboardEventInit) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...options })
  );
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("g+c navigates to /dashboard/contacts", () => {
    renderHook(() => useKeyboardShortcuts());

    pressKey("g");
    pressKey("c");

    expect(mockPush).toHaveBeenCalledWith("/dashboard/contacts");
  });

  it("g+d navigates to /dashboard/deals", () => {
    renderHook(() => useKeyboardShortcuts());

    pressKey("g");
    pressKey("d");

    expect(mockPush).toHaveBeenCalledWith("/dashboard/deals");
  });

  it("g+t navigates to /dashboard/tasks", () => {
    renderHook(() => useKeyboardShortcuts());

    pressKey("g");
    pressKey("t");

    expect(mockPush).toHaveBeenCalledWith("/dashboard/tasks");
  });

  it("g+p navigates to /dashboard/pipeline", () => {
    renderHook(() => useKeyboardShortcuts());

    pressKey("g");
    pressKey("p");

    expect(mockPush).toHaveBeenCalledWith("/dashboard/pipeline");
  });

  it("pressing only 'g' does not navigate", () => {
    renderHook(() => useKeyboardShortcuts());

    pressKey("g");
    vi.advanceTimersByTime(600);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("pressing 'c' without 'g' prefix does not navigate", () => {
    renderHook(() => useKeyboardShortcuts());

    pressKey("c");

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("g+c with ctrlKey held does not navigate", () => {
    renderHook(() => useKeyboardShortcuts());

    pressKey("g", { ctrlKey: true });
    pressKey("c", { ctrlKey: true });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("g+c dispatched from an INPUT element does not navigate", () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);

    const gEvent = new KeyboardEvent("keydown", { key: "g", bubbles: true });
    Object.defineProperty(gEvent, "target", { value: input });
    input.dispatchEvent(gEvent);

    const cEvent = new KeyboardEvent("keydown", { key: "c", bubbles: true });
    Object.defineProperty(cEvent, "target", { value: input });
    input.dispatchEvent(cEvent);

    expect(mockPush).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
