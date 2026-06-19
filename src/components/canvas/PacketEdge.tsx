"use client";

import { memo, useMemo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { useSimulationStore } from "@/store/useSimulationStore";

const PacketEdge = memo(function PacketEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const allPackets = useSimulationStore((s) => s.packets);

  const activePackets = useMemo(
    () => allPackets.filter((p) => p.currentEdgeId === id && p.edgeProgress < 1),
    [allPackets, id],
  );

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const getPacketColor = (status: string) => {
    const colors: Record<string, string> = {
      created: "#94a3b8",
      "in-flight": "#fbbf24",
      hit: "#34d399",
      miss: "#f87171",
      success: "#10b981",
      error: "#ef4444",
      timeout: "#f97316",
    };
    return colors[status] || "#94a3b8";
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#facc15" : "#475569",
          strokeWidth: selected ? 3 : 2,
        }}
      />
      {activePackets.map((packet) => {
        const t = packet.edgeProgress;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const px = sourceX + dx * t;
        const py = sourceY + dy * t;
        return (
          <circle
            key={packet.id}
            cx={px}
            cy={py}
            r={5}
            fill={getPacketColor(packet.status)}
            stroke="white"
            strokeWidth={1.5}
          >
            <title>
              {`${packet.requestType.toUpperCase()} - ${packet.status}`}
            </title>
          </circle>
        );
      })}
      {activePackets.length > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              fontSize: 10,
              color: "#94a3b8",
            }}
            className="nodrag nopan"
          >
            {activePackets.length}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default PacketEdge;
