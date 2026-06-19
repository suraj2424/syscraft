/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, memo } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { Zap, Server, Database, HardDrive, Activity, GitBranch, Radio, Layers } from "lucide-react";
import type { NodeType, SysCraftNode } from "@/types/simulation";

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

function NodeRow({ node, isSelected, onSelect }: {
  node: SysCraftNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const nodeType = node.data.nodeType as NodeType;
  const label = node.data.label as string;
  const config = node.data.config as any;
  const metrics = node.data.metrics as any;
  const Icon = iconMap[nodeType] || Zap;
  const color = colorMap[nodeType] || "#7d8187";

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

const MemoizedNodeRow = memo(NodeRow);

function InlineConfig({ nodeId, nodeType, config }: { nodeId: string; nodeType: NodeType; config: any }) {
  const updateNodeConfig = useSimulationStore((s) => s.updateNodeConfig);

  const handleChange = useCallback((field: string, value: any) => {
    updateNodeConfig(nodeId, { [field]: value });
  }, [nodeId, updateNodeConfig]);

  const renderField = (label: string, control: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] text-body-mid min-w-[80px]">{label}</span>
      <div className="flex-1">{control}</div>
    </div>
  );

  switch (nodeType) {
    case "client":
      return (
        <>
          {renderField("RPS", (
            <input type="number" value={config.rps} min={1} max={100000}
              onChange={(e) => handleChange("rps", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("Payload KB", (
            <input type="number" value={config.payloadSizeKB} min={1} max={1024}
              onChange={(e) => handleChange("payloadSizeKB", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("Read Ratio", (
            <input type="number" value={config.readWriteRatio} min={0} max={1} step={0.1}
              onChange={(e) => handleChange("readWriteRatio", Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
        </>
      );
    case "loadBalancer":
      return (
        <div className="flex items-center justify-between gap-3 py-1.5">
          <span className="text-[11px] text-body-mid min-w-[80px]">Algorithm</span>
          <select value={config.algorithm} onChange={(e) => handleChange("algorithm", e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30"
          >
            <option value="round-robin">Round Robin</option>
            <option value="least-connections">Least Connections</option>
            <option value="ip-hash">IP Hash</option>
          </select>
        </div>
      );
    case "apiGateway":
      return (
        <>
          {renderField("Rate Limit", (
            <input type="number" value={config.rateLimitRps} min={100} max={100000}
              onChange={(e) => handleChange("rateLimitRps", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          <div className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-[11px] text-body-mid min-w-[80px]">Auth</span>
            <button
              onClick={() => handleChange("authEnabled", !config.authEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                config.authEnabled ? "bg-ink/80" : "bg-canvas-mid"
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                config.authEnabled ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </>
      );
    case "webServer":
      return (
        <>
          {renderField("Max Conc.", (
            <input type="number" value={config.maxConcurrent} min={1} max={10000}
              onChange={(e) => handleChange("maxConcurrent", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("Proc ms", (
            <input type="number" value={config.processingTimeMs} min={1} max={10000}
              onChange={(e) => handleChange("processingTimeMs", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("Fail Rate", (
            <input type="number" value={config.failureRate} min={0} max={1} step={0.01}
              onChange={(e) => handleChange("failureRate", Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
        </>
      );
    case "cache":
      return (
        <>
          {renderField("Size MB", (
            <input type="number" value={config.sizeMB} min={1} max={65536}
              onChange={(e) => handleChange("sizeMB", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("TTL sec", (
            <input type="number" value={config.ttlSec} min={1} max={86400}
              onChange={(e) => handleChange("ttlSec", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          <div className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-[11px] text-body-mid min-w-[80px]">Eviction</span>
            <select value={config.evictionPolicy} onChange={(e) => handleChange("evictionPolicy", e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30"
            >
              <option value="LRU">LRU</option>
              <option value="LFU">LFU</option>
            </select>
          </div>
          {renderField("Hit Rate", (
            <input type="number" value={config.hitRate} min={0} max={1} step={0.05}
              onChange={(e) => handleChange("hitRate", Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
        </>
      );
    case "sqlDb":
    case "noSqlDb":
      return (
        <>
          <div className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-[11px] text-body-mid min-w-[80px]">Replication</span>
            <select value={config.replicationMode} onChange={(e) => handleChange("replicationMode", e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30"
            >
              <option value="single">Single</option>
              <option value="master-slave">Master-Slave</option>
            </select>
          </div>
          {renderField("Read Thrpt", (
            <input type="number" value={config.maxReadThroughput} min={1} max={100000}
              onChange={(e) => handleChange("maxReadThroughput", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("Write Thrpt", (
            <input type="number" value={config.maxWriteThroughput} min={1} max={100000}
              onChange={(e) => handleChange("maxWriteThroughput", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("Repl Lag ms", (
            <input type="number" value={config.replicationLagMs} min={0} max={10000}
              onChange={(e) => handleChange("replicationLagMs", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
        </>
      );
    case "messageQueue":
      return (
        <>
          {renderField("Max Queue", (
            <input type="number" value={config.maxQueueSize} min={100} max={1000000}
              onChange={(e) => handleChange("maxQueueSize", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
          {renderField("Proc Rate", (
            <input type="number" value={config.processingRate} min={1} max={100000}
              onChange={(e) => handleChange("processingRate", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30 text-right"
            />
          ))}
        </>
      );
    default:
      return null;
  }
}

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
