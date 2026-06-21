"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { useSimulationStore } from "@/store/useSimulationStore";

interface EdgeWindow {
  arrivalCount: number;
  windowStartMs: number;
}

const edgeWindowStore = new Map<string, EdgeWindow>();
const ROLLING_WINDOW_MS = 2000;

function addArrivals(edgeId: string, count: number, nowMs: number): void {
  if (count <= 0) return;
  const entry = edgeWindowStore.get(edgeId);
  if (!entry) {
    edgeWindowStore.set(edgeId, { arrivalCount: count, windowStartMs: nowMs });
    return;
  }
  const elapsed = nowMs - entry.windowStartMs;
  if (elapsed >= ROLLING_WINDOW_MS) {
    edgeWindowStore.set(edgeId, { arrivalCount: count, windowStartMs: nowMs });
    return;
  }
  entry.arrivalCount += count;
}

function getRps(edgeId: string, nowMs: number): number {
  const entry = edgeWindowStore.get(edgeId);
  if (!entry) return 0;
  const elapsed = nowMs - entry.windowStartMs;
  if (elapsed <= 0) return 0;
  return (entry.arrivalCount * 1000) / elapsed;
}

const PACKET_COLORS: Record<string, string> = {
  created: "#94a3b8",
  "in-flight": "#fbbf24",
  hit: "#34d399",
  miss: "#f87171",
  success: "#10b981",
  error: "#ef4444",
  timeout: "#f97316",
  blocked: "#a0c3ec",
};

const PACKET_STATUS_LABEL: Record<string, string> = {
  created: "Created",
  "in-flight": "In Flight",
  hit: "Cache Hit",
  miss: "Cache Miss",
  success: "Success",
  error: "Error",
  timeout: "Timeout",
  blocked: "Blocked",
};

const PacketEdge = memo(function PacketEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const allPackets = useSimulationStore((s) => s.packets);

  const activePackets = useMemo(
    () => allPackets.filter((p) => p.currentEdgeId === id && p.edgeProgress < 1),
    [allPackets, id],
  );

  const prevOnEdgeRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!useSimulationStore.getState().simulation.isRunning) {
      prevOnEdgeRef.current = new Set(activePackets.map((p) => p.id));
      return;
    }
    const currentIds = new Set(activePackets.map((p) => p.id));
    let newArrivals = 0;
    for (const pid of currentIds) {
      if (!prevOnEdgeRef.current.has(pid)) newArrivals++;
    }
    prevOnEdgeRef.current = currentIds;
    if (newArrivals > 0) addArrivals(id, newArrivals, performance.now());
  }, [activePackets, id]);

  const [, setTickNow] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTickNow(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const strokeColor = selected ? "#ffffff" : "#363a3f";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2.5 : 2,
        }}
      />
      {activePackets.map((packet) => {
        const t = packet.edgeProgress;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const px = sourceX + dx * t;
        const py = sourceY + dy * t;
        return (
          <g key={packet.id}>
            <circle
              cx={px}
              cy={py}
              r={5}
              fill={PACKET_COLORS[packet.status] || "#94a3b8"}
              stroke="#0a0a0a"
              strokeWidth={1.5}
            >
              <title>
                {`${packet.requestType.toUpperCase()} - ${PACKET_STATUS_LABEL[packet.status] || packet.status}`}
              </title>
            </circle>
          </g>
        );
      })}
      {activePackets.length > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              left: labelX,
              top: labelY,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              fontSize: 10,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              color: "#7d8187",
              background: "#0a0a0a",
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid #212327",
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan"
          >
            {Math.round(getRps(id, performance.now()))} RPS
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default PacketEdge;
