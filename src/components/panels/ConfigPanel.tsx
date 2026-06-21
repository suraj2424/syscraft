/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { X, Settings, BarChart3, Wrench } from "lucide-react";
import { ConfigForm } from "./ConfigForm";
import { MetricsView } from "./MetricsView";

export function ConfigPanel() {
  const selectedNodeId = useSimulationStore((s) => s.selectedNodeId);
  const nodes = useSimulationStore((s) => s.nodes);
  const updateNodeConfig = useSimulationStore((s) => s.updateNodeConfig);
  const selectNode = useSimulationStore((s) => s.selectNode);
  const activePanel = useSimulationStore((s) => s.activePanel);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);

  const collapsed = activePanel !== "config";

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [selectedNodeId, nodes],
  );

  const { config, metrics, nodeType, label } = selectedNode?.data || {};

  const panelLabel = selectedNode?.data.label || "Config";
  const panelType = selectedNode?.data.nodeType;

  const header = (
    <div
      onClick={() => setActivePanel(activePanel === "config" ? null : "config")}
      className="flex items-center justify-between px-4 py-3 border-b border-hairline cursor-pointer hover:bg-canvas-soft/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Wrench className="h-3.5 w-3.5 text-body-mid flex-shrink-0" />
        <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid">{panelLabel}</span>
        {panelType && (
          <span className="text-[10px] text-body-mid font-mono uppercase tracking-[1.2px]">
            {panelType}
          </span>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); selectNode(null); setActivePanel(null); }}
        className="p-1.5 rounded-full border border-hairline hover:border-white/30 transition-colors"
      >
        <X className="h-3.5 w-3.5 text-body-mid" />
      </button>
    </div>
  );

  if (!selectedNode || !nodeType) {
    return (
      <div className={`flex flex-col bg-canvas border-t border-hairline relative transition-[flex] duration-300 ease-in-out ${collapsed ? '' : 'flex-1'}`} style={{ minHeight: 0 }}>
        {header}
        {!collapsed && (
          <div className="flex-1 flex items-center justify-center p-6 bg-canvas">
            <div className="text-center">
              <Settings className="h-8 w-8 text-body-mid mb-3 mx-auto" />
              <p className="text-xs text-mute font-mono uppercase tracking-[1.2px]">
                Select a node on the canvas to view and edit its configuration
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-canvas border-t border-hairline relative transition-[flex] duration-300 ease-in-out ${collapsed ? '' : 'flex-1'}`} style={{ minHeight: 0 }}>
      {header}
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent">
            <div className="bg-canvas-card border border-hairline rounded-sm p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Settings className="h-3 w-3 text-body-mid" />
                <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid">
                  Configuration
                </span>
              </div>
              <div className="space-y-1">
                <ConfigForm nodeType={nodeType} config={config} nodeId={selectedNodeId!} onChange={updateNodeConfig} />
              </div>
            </div>

            <div className="bg-canvas-card border border-hairline rounded-sm p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <BarChart3 className="h-3 w-3 text-body-mid" />
                <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid">
                  Metrics
                </span>
              </div>
              <div className="space-y-1">
                <MetricsView nodeType={nodeType} metrics={metrics} config={config} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
