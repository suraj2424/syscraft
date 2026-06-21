/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { memo } from "react";
import { Zap, Server, Database, HardDrive, Activity, GitBranch, Radio } from "lucide-react";
import type { NodeType, SysCraftNode } from "@/types/simulation";
import { InlineConfig } from "./InlineConfig";

const iconMap: Record<NodeType, React.ElementType> = {
  client: Zap,
  loadBalancer: Activity,
  apiGateway: GitBranch,
  webServer: Server,
  cache: HardDrive,
  sqlDb: Database,
  noSqlDb: Database,
  messageQueue: Radio,
};

const colorMap: Record<NodeType, string> = {
  client: "#ffc285",
  loadBalancer: "#c4b5fd",
  apiGateway: "#a0c3ec",
  webServer: "#ffffff",
  cache: "#ff7a17",
  sqlDb: "#8b5cf6",
  noSqlDb: "#f97316",
  messageQueue: "#ec4899",
};

function formatValue(v: number, decimals = 0) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v.toFixed(decimals)}`;
}

export function NodeRow({ node, isSelected, onSelect }: {
  node: SysCraftNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const nodeType = node.data.nodeType as NodeType;
  const label = node.data.label as string;
  const config = node.data.config as any;
  const metrics = node.data.metrics as any;
  const Icon = iconMap[nodeType] || Zap;

  const renderKeyMetrics = () => {
    const m = metrics as any;
    const c = config as any;
    switch (nodeType) {
      case "client":
        return (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Sent</div>
              <div className="text-xs text-ink font-mono mt-0.5">{formatValue(m.totalSent)}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Failed</div>
              <div className="text-xs text-red-400 font-mono mt-0.5">{formatValue(m.failedRequests)}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Latency</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.avgLatencyMs}ms</div>
            </div>
          </div>
        );
      case "loadBalancer":
        return (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Active</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.activeConnections}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1 col-span-2">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Algorithm</div>
              <div className="text-xs text-ink font-mono mt-0.5">{(c.algorithm || "").replace("-", " ")}</div>
            </div>
          </div>
        );
      case "apiGateway":
        return (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Routed</div>
              <div className="text-xs text-ink font-mono mt-0.5">{formatValue(m.requestsRouted)}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Blocked</div>
              <div className="text-xs text-red-400 font-mono mt-0.5">{formatValue(m.requestsBlocked)}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Auth</div>
              <div className="text-xs text-ink font-mono mt-0.5">{c.authEnabled ? "ON" : "OFF"}</div>
            </div>
          </div>
        );
      case "webServer":
        return (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">CPU</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.cpuLoad}%</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Queue</div>
              <div className="text-xs text-amber-400 font-mono mt-0.5">{m.queueSize}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Threads</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.activeThreads}</div>
            </div>
          </div>
        );
      case "cache":
        return (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Hit Rate</div>
              <div className="text-xs text-ink font-mono mt-0.5">{(m.hitRate * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Size</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.currentSizeMB}MB</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">TTL</div>
              <div className="text-xs text-ink font-mono mt-0.5">{c.ttlSec}s</div>
            </div>
          </div>
        );
      case "sqlDb":
      case "noSqlDb":
        return (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Repl</div>
              <div className="text-xs text-ink font-mono mt-0.5">{(c.replicationMode || "").replace("-", " ")}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Conn</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.connectionsActive}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Latency</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.queryLatencyMs}ms</div>
            </div>
          </div>
        );
      case "messageQueue":
        return (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Depth</div>
              <div className="text-xs text-ink font-mono mt-0.5">{m.queueDepth}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Processed</div>
              <div className="text-xs text-ink font-mono mt-0.5">{formatValue(m.processedCount)}</div>
            </div>
            <div className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1">
              <div className="text-[9px] text-body-mid uppercase tracking-wider">Rate</div>
              <div className="text-xs text-ink font-mono mt-0.5">{formatValue(c.processingRate)}/s</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-b border-hairline">
      <button
        onClick={() => onSelect(node.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left ${
          isSelected ? "bg-canvas-soft" : "hover:bg-canvas-soft"
        }`}
      >
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: colorMap[nodeType] || "#7d8187" }}
        />
        <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: colorMap[nodeType] || "#7d8187" }} />
        <span className="text-sm font-normal text-ink truncate flex-1">{label}</span>
        <span className="text-[10px] text-body-mid uppercase tracking-wider flex-shrink-0">
          {nodeType}
        </span>
      </button>
      {isSelected && (
        <div className="px-3 pb-2 border-t border-hairline bg-canvas">
          <InlineConfig nodeId={node.id} nodeType={nodeType} config={config} />
          <div className="mt-2">
            {renderKeyMetrics()}
          </div>
        </div>
      )}
    </div>
  );
}

export const MemoizedNodeRow = memo(NodeRow);
