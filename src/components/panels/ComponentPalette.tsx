/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import type { NodeType } from "@/types/simulation";
import { Zap, Server, Database, HardDrive, Activity, GitBranch, Radio } from "lucide-react";

const iconMap: Record<string, any> = {
  client: Zap,
  loadBalancer: Activity,
  apiGateway: GitBranch,
  webServer: Server,
  cache: HardDrive,
  sqlDb: Database,
  noSqlDb: Database,
  messageQueue: Radio,
};

const nodeDefinitions: {
  id: NodeType;
  label: string;
  color: string;
}[] = [
  { id: "client", label: "Client", color: "#ffc285" },
  { id: "loadBalancer", label: "Load Balancer", color: "#c4b5fd" },
  { id: "apiGateway", label: "API Gateway", color: "#a0c3ec" },
  { id: "webServer", label: "Web Server", color: "#ffffff" },
  { id: "cache", label: "Cache", color: "#ff7a17" },
  { id: "sqlDb", label: "SQL Database", color: "#8b5cf6" },
  { id: "noSqlDb", label: "NoSQL Database", color: "#f97316" },
  { id: "messageQueue", label: "Message Queue", color: "#ec4899" },
];

export function ComponentPalette() {
  const { scenarios, loadScenario } = useSimulationStore();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/syscraft-node", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-hairline flex-shrink-0">
        <div className="text-[12px] font-normal uppercase tracking-[1.2px] text-body-mid">
          Components
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {nodeDefinitions.map(({ id, label, color }) => {
            const Icon = iconMap[id];
            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => onDragStart(e, id)}
                className="flex items-center gap-3 px-3 py-2 rounded-sm bg-canvas-card border border-hairline hover:border-white/30 transition-colors cursor-grab active:cursor-grabbing"
              >
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-normal text-ink truncate">{label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-hairline">
          <div className="text-[12px] font-normal uppercase tracking-[1.2px] text-body-mid">
            Scenarios
          </div>
        </div>

        <div className="p-3 space-y-1.5">
          {Object.values(scenarios).map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => loadScenario(scenario.id)}
              className="w-full text-left px-3 py-2 rounded-sm bg-canvas-card border border-hairline hover:border-white/30 transition-colors group"
            >
              <div className="text-[13px] font-normal text-ink group-hover:text-ink-hover">
                {scenario.name}
              </div>
              <div className="text-[11px] text-body-mid mt-1 leading-relaxed">
                {scenario.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-hairline">
        <div className="text-[10px] text-mute leading-relaxed">
          Drag components onto the canvas to start building your system.
        </div>
      </div>
    </div>
  );
}
