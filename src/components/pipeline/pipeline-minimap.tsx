"use client";

import { useEffect, useRef, useCallback } from "react";
import type { CanvasTransform } from "@/hooks/use-canvas-transform";

interface PipelineMinimapProps {
  transform: CanvasTransform;
  columnCount: number;
  containerWidth: number;
  containerHeight: number;
  contentWidth: number;
  contentHeight: number;
  stageColors: string[];
  onNavigate: (x: number, y: number) => void;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 100;

export function PipelineMinimap({
  transform,
  columnCount,
  containerWidth,
  containerHeight,
  contentWidth,
  contentHeight,
  stageColors,
  onNavigate,
}: PipelineMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Background
    ctx.fillStyle = "rgba(128, 128, 128, 0.1)";
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Scale content to minimap
    const scaleX = MINIMAP_WIDTH / Math.max(contentWidth, containerWidth);
    const scaleY = MINIMAP_HEIGHT / Math.max(contentHeight, containerHeight);
    const scale = Math.min(scaleX, scaleY) * 0.9;

    // Draw columns
    const colWidth = (contentWidth / columnCount) * scale;
    const colHeight = contentHeight * scale * 0.8;
    const offsetX = (MINIMAP_WIDTH - contentWidth * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - colHeight) / 2;

    for (let i = 0; i < columnCount; i++) {
      ctx.fillStyle = stageColors[i] || "#6b7280";
      ctx.globalAlpha = 0.4;
      ctx.fillRect(
        offsetX + i * colWidth + 1,
        offsetY,
        colWidth - 2,
        colHeight
      );
      ctx.globalAlpha = 1;
    }

    // Draw viewport indicator
    const vpX = offsetX + (-transform.x / transform.scale) * scale;
    const vpY = offsetY + (-transform.y / transform.scale) * scale;
    const vpW = (containerWidth / transform.scale) * scale;
    const vpH = (containerHeight / transform.scale) * scale;

    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fillRect(vpX, vpY, vpW, vpH);
  }, [transform, columnCount, containerWidth, containerHeight, contentWidth, contentHeight, stageColors]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = MINIMAP_WIDTH / Math.max(contentWidth, containerWidth);
    const scaleY = MINIMAP_HEIGHT / Math.max(contentHeight, containerHeight);
    const scale = Math.min(scaleX, scaleY) * 0.9;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const offsetX = (MINIMAP_WIDTH - contentWidth * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - contentHeight * scale * 0.8) / 2;

    const worldX = (clickX - offsetX) / scale;
    const worldY = (clickY - offsetY) / scale;

    onNavigate(
      -(worldX * transform.scale - containerWidth / 2),
      -(worldY * transform.scale - containerHeight / 2)
    );
  };

  return (
    <canvas
      ref={canvasRef}
      className="border rounded-lg bg-background/80 backdrop-blur-sm shadow-sm cursor-pointer"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onClick={handleClick}
    />
  );
}
