"use client";

import React, { useCallback } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { Layers } from "lucide-react";
import { MemoizedNodeRow } from "./NodeRow";

export function NodeListPanel() {
  const nodes = useSimulationStore((s) => s.nodes);
  const selectedNodeId = useSimulationStore((s) => s.selectedNodeId);
  const selectNode = useSimulationStore((s) => s.selectNode);

  const handleSelect = useCallback((id: string) => selectNode(id), [selectNode]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <Layers className="h-8 w-8 text-body-mid mb-3" />
        <p className="text-xs text-mute">Drag components onto the canvas to configure them here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-hairline flex-shrink-0">
        <span className="text-[11px] font-normal uppercase tracking-wider text-body-mid">
          Nodes
        </span>
        <span className="text-[11px] text-body-mid font-mono">{nodes.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {nodes.map((n) => (
          <MemoizedNodeRow key={n.id} node={n} isSelected={n.id === selectedNodeId} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  );
}
