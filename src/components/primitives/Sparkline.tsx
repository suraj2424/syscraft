"use client";

import React, { useEffect, useRef } from "react";

interface SparklineProps {
  value: number;
  maxPoints?: number;
  width?: number;
  height?: number;
  color?: string;
  minVal?: number;
  maxVal?: number;
}

export function Sparkline({
  value,
  maxPoints = 15,
  width = 60,
  height = 16,
  color = "#ff7a17",
  minVal,
  maxVal,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    historyRef.current.push(value);
    if (historyRef.current.length > maxPoints) {
      historyRef.current.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const points = historyRef.current;
    if (points.length < 2) return;

    // Scale calculations
    const computedMax = maxVal !== undefined ? maxVal : Math.max(...points);
    const computedMin = minVal !== undefined ? minVal : Math.min(...points);
    const range = computedMax - computedMin === 0 ? 1 : computedMax - computedMin;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const dx = width / (maxPoints - 1);
    const startIdx = maxPoints - points.length;

    points.forEach((val, i) => {
      const x = (startIdx + i) * dx;
      // Flip Y because canvas origin is top-left
      const y = height - 1 - ((val - computedMin) / range) * (height - 2);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [value, maxPoints, width, height, color, minVal, maxVal]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="opacity-70 border border-white/5 bg-black/20 rounded-[2px]"
    />
  );
}
