import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasTransform } from "@/hooks/use-canvas-transform";

describe("useCanvasTransform", () => {
  it("should have correct initial state: transform is {x:0, y:0, scale:1}", () => {
    const { result } = renderHook(() => useCanvasTransform());

    expect(result.current.transform).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("zoomIn: increases scale by 0.1", () => {
    const { result } = renderHook(() => useCanvasTransform());

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.transform.scale).toBeCloseTo(1.1, 5);
    expect(result.current.transform.x).toBe(0);
    expect(result.current.transform.y).toBe(0);
  });

  it("zoomIn: does not exceed MAX_SCALE (2.0) when called many times", () => {
    const { result } = renderHook(() => useCanvasTransform());

    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.zoomIn();
      }
    });

    expect(result.current.transform.scale).toBeCloseTo(2.0, 5);
  });

  it("zoomOut: decreases scale by 0.1", () => {
    const { result } = renderHook(() => useCanvasTransform());

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.transform.scale).toBeCloseTo(0.9, 5);
    expect(result.current.transform.x).toBe(0);
    expect(result.current.transform.y).toBe(0);
  });

  it("zoomOut: does not go below MIN_SCALE (0.3) when called many times", () => {
    const { result } = renderHook(() => useCanvasTransform());

    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.zoomOut();
      }
    });

    expect(result.current.transform.scale).toBeCloseTo(0.3, 5);
  });

  it("resetView: resets to {x:0, y:0, scale:1}", () => {
    const { result } = renderHook(() => useCanvasTransform());

    // Change the transform first
    act(() => {
      result.current.zoomIn();
      result.current.zoomIn();
    });

    expect(result.current.transform.scale).not.toBe(1);

    act(() => {
      result.current.resetView();
    });

    expect(result.current.transform).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("fitToScreen: calculates correct scale based on container/content width", () => {
    const { result } = renderHook(() => useCanvasTransform());

    // containerWidth=500, contentWidth=1000 => scale = min(1, (500-40)/1000) = min(1, 0.46) = 0.46
    act(() => {
      result.current.fitToScreen(500, 1000);
    });

    expect(result.current.transform.scale).toBeCloseTo(0.46, 5);
    expect(result.current.transform.x).toBe(20);
    expect(result.current.transform.y).toBe(20);
  });

  it("fitToScreen: scale doesn't go below MIN_SCALE (0.3)", () => {
    const { result } = renderHook(() => useCanvasTransform());

    // containerWidth=50, contentWidth=1000 => scale = (50-40)/1000 = 0.01
    // clamped to MIN_SCALE = 0.3
    act(() => {
      result.current.fitToScreen(50, 1000);
    });

    expect(result.current.transform.scale).toBeCloseTo(0.3, 5);
    expect(result.current.transform.x).toBe(20);
    expect(result.current.transform.y).toBe(20);
  });

  it("fitToScreen: scale doesn't exceed 1", () => {
    const { result } = renderHook(() => useCanvasTransform());

    // containerWidth=2000, contentWidth=100 => scale = min(1, (2000-40)/100) = min(1, 19.6) = 1
    act(() => {
      result.current.fitToScreen(2000, 100);
    });

    expect(result.current.transform.scale).toBeCloseTo(1, 5);
    expect(result.current.transform.x).toBe(20);
    expect(result.current.transform.y).toBe(20);
  });

  it("handlers object has all expected keys", () => {
    const { result } = renderHook(() => useCanvasTransform());

    const expectedKeys = [
      "onWheel",
      "onMouseDown",
      "onMouseMove",
      "onMouseUp",
      "onMouseLeave",
      "onTouchStart",
      "onTouchMove",
      "onTouchEnd",
    ];

    for (const key of expectedKeys) {
      expect(result.current.handlers).toHaveProperty(key);
      expect(typeof result.current.handlers[key as keyof typeof result.current.handlers]).toBe(
        "function"
      );
    }
  });
});
