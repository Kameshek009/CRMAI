"use client";

import { useState, useCallback, useRef, type WheelEvent, type MouseEvent, type TouchEvent } from "react";

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.0;
const ZOOM_SENSITIVITY = 0.002;

export function useCanvasTransform() {
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef(0);

  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + 0.1),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale - 0.1),
    }));
  }, []);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const fitToScreen = useCallback((containerWidth: number, contentWidth: number) => {
    const scale = Math.min(1, (containerWidth - 40) / contentWidth);
    setTransform({ x: 20, y: 20, scale: Math.max(MIN_SCALE, scale) });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom toward cursor
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setTransform((prev) => {
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta));
        const scaleRatio = newScale / prev.scale;

        return {
          x: cursorX - (cursorX - prev.x) * scaleRatio,
          y: cursorY - (cursorY - prev.y) * scaleRatio,
          scale: newScale,
        };
      });
    } else {
      // Pan
      setTransform((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only pan on middle click or when clicking on the background
    if (e.button === 1 || (e.target as HTMLElement).dataset.canvas === "true") {
      isPanning.current = true;
      lastPosition.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).style.cursor = "grabbing";
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPosition.current.x;
    const dy = e.clientY - lastPosition.current.y;
    lastPosition.current = { x: e.clientX, y: e.clientY };

    setTransform((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).style.cursor = "";
  }, []);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDistance.current = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      isPanning.current = true;
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dist = getTouchDistance(e.touches);
      if (lastTouchDistance.current > 0) {
        const delta = (dist - lastTouchDistance.current) * 0.005;
        setTransform((prev) => ({
          ...prev,
          scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta)),
        }));
      }
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && isPanning.current) {
      const dx = e.touches[0].clientX - lastPosition.current.x;
      const dy = e.touches[0].clientY - lastPosition.current.y;
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      setTransform((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
    lastTouchDistance.current = 0;
  }, []);

  return {
    transform,
    setTransform,
    zoomIn,
    zoomOut,
    resetView,
    fitToScreen,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
