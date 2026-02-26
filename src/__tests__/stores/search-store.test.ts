import { describe, it, expect, beforeEach } from "vitest";
import { useSearchStore } from "@/stores/search-store";

describe("useSearchStore", () => {
  beforeEach(() => {
    useSearchStore.setState({ open: false });
  });

  it("should have open=false as initial state", () => {
    const state = useSearchStore.getState();

    expect(state.open).toBe(false);
  });

  it("should set open=true when setOpen(true) is called", () => {
    useSearchStore.getState().setOpen(true);

    expect(useSearchStore.getState().open).toBe(true);
  });

  it("should set open=false after being set to true", () => {
    useSearchStore.getState().setOpen(true);
    expect(useSearchStore.getState().open).toBe(true);

    useSearchStore.getState().setOpen(false);
    expect(useSearchStore.getState().open).toBe(false);
  });

  it("should handle multiple toggles correctly", () => {
    const { setOpen } = useSearchStore.getState();

    setOpen(true);
    expect(useSearchStore.getState().open).toBe(true);

    setOpen(false);
    expect(useSearchStore.getState().open).toBe(false);

    setOpen(true);
    expect(useSearchStore.getState().open).toBe(true);

    setOpen(true);
    expect(useSearchStore.getState().open).toBe(true);

    setOpen(false);
    expect(useSearchStore.getState().open).toBe(false);
  });
});
