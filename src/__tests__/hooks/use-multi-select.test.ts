import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMultiSelect } from "@/hooks/use-multi-select";

describe("useMultiSelect", () => {
  it("should initialize with empty selection", () => {
    const { result } = renderHook(() => useMultiSelect());

    expect(result.current.count).toBe(0);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selected.size).toBe(0);
  });

  it("should add an ID when toggled", () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggle("item-1");
    });

    expect(result.current.count).toBe(1);
    expect(result.current.selectedIds).toEqual(["item-1"]);
    expect(result.current.isSelected("item-1")).toBe(true);
  });

  it("should remove an ID when toggled twice", () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggle("item-1");
    });

    expect(result.current.isSelected("item-1")).toBe(true);

    act(() => {
      result.current.toggle("item-1");
    });

    expect(result.current.count).toBe(0);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.isSelected("item-1")).toBe(false);
  });

  it("should select all IDs with selectAll", () => {
    const { result } = renderHook(() => useMultiSelect());
    const ids = ["item-1", "item-2", "item-3"];

    act(() => {
      result.current.selectAll(ids);
    });

    expect(result.current.count).toBe(3);
    expect(result.current.selectedIds).toEqual(ids);
    expect(result.current.isAllSelected(ids)).toBe(true);
  });

  it("should clear all selections with deselectAll", () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.selectAll(["item-1", "item-2", "item-3"]);
    });

    expect(result.current.count).toBe(3);

    act(() => {
      result.current.deselectAll();
    });

    expect(result.current.count).toBe(0);
    expect(result.current.selectedIds).toEqual([]);
  });

  it("should return correct value for isSelected", () => {
    const { result } = renderHook(() => useMultiSelect());

    expect(result.current.isSelected("item-1")).toBe(false);

    act(() => {
      result.current.toggle("item-1");
    });

    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.isSelected("item-2")).toBe(false);
  });

  it("should return true for isAllSelected when all IDs are selected", () => {
    const { result } = renderHook(() => useMultiSelect());
    const ids = ["item-1", "item-2", "item-3"];

    act(() => {
      result.current.selectAll(ids);
    });

    expect(result.current.isAllSelected(ids)).toBe(true);
    expect(result.current.isAllSelected(["item-1", "item-2"])).toBe(true);
  });

  it("should return false for isAllSelected when not all IDs are selected", () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.selectAll(["item-1", "item-2"]);
    });

    expect(result.current.isAllSelected(["item-1", "item-2", "item-3"])).toBe(false);
    expect(result.current.isAllSelected(["item-1", "item-4"])).toBe(false);
  });

  it("should return false for isAllSelected with empty array", () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.selectAll(["item-1", "item-2"]);
    });

    expect(result.current.isAllSelected([])).toBe(false);
  });

  it("should reflect current selection size in count", () => {
    const { result } = renderHook(() => useMultiSelect());

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.toggle("item-1");
    });
    expect(result.current.count).toBe(1);

    act(() => {
      result.current.toggle("item-2");
    });
    expect(result.current.count).toBe(2);

    act(() => {
      result.current.toggle("item-1");
    });
    expect(result.current.count).toBe(1);

    act(() => {
      result.current.deselectAll();
    });
    expect(result.current.count).toBe(0);
  });

  it("should return array of selected IDs in selectedIds", () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggle("item-1");
      result.current.toggle("item-3");
      result.current.toggle("item-2");
    });

    expect(result.current.selectedIds).toHaveLength(3);
    expect(result.current.selectedIds).toContain("item-1");
    expect(result.current.selectedIds).toContain("item-2");
    expect(result.current.selectedIds).toContain("item-3");
  });
});
