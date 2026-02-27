import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

describe("useUnsavedChanges", () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("should NOT add beforeunload listener when hasChanges is false", () => {
    renderHook(() => useUnsavedChanges(false));

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "beforeunload"
    );
    expect(beforeUnloadCalls).toHaveLength(0);
  });

  it("should add beforeunload listener when hasChanges is true", () => {
    renderHook(() => useUnsavedChanges(true));

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "beforeunload"
    );
    expect(beforeUnloadCalls).toHaveLength(1);
  });

  it("should remove listener on unmount when hasChanges is true", () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true));

    unmount();

    const removeBeforeUnloadCalls = removeSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "beforeunload"
    );
    expect(removeBeforeUnloadCalls).toHaveLength(1);
  });

  it("should add then remove listener when hasChanges goes false → true → false", () => {
    const { rerender } = renderHook(
      ({ hasChanges }) => useUnsavedChanges(hasChanges),
      { initialProps: { hasChanges: false } }
    );

    // false → no listener added
    let addCalls = addSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "beforeunload"
    );
    expect(addCalls).toHaveLength(0);

    // false → true: listener added
    rerender({ hasChanges: true });
    addCalls = addSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "beforeunload"
    );
    expect(addCalls).toHaveLength(1);

    // true → false: listener removed (cleanup from previous effect)
    rerender({ hasChanges: false });
    const removeCalls = removeSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === "beforeunload"
    );
    expect(removeCalls).toHaveLength(1);
  });
});
