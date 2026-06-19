/* eslint-disable @typescript-eslint/no-explicit-any */

import { useSimulationStore } from "@/store/useSimulationStore";
import { X, Settings, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useCallback, useState } from "react";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-[11px] text-body-mid min-w-[80px]">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full px-4 py-3 bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30"
    />
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-canvas-soft border border-hairline rounded-sm text-ink focus:outline-none focus:border-ink/30"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToggleInput({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        value ? "bg-ink/80" : "bg-canvas-mid"
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          value ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function MetricBar({
  label,
  value,
  max,
  unit,
  color = "#7d8187",
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-body-mid">{label}</span>
        <span className="text-body font-mono">
          {value}
          {unit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-hairline rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-100"
        />
      </div>
    </div>
  );
}

export function ConfigPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const selectedNodeId = useSimulationStore((s) => s.selectedNodeId);
  const nodes = useSimulationStore((s) => s.nodes);
  const updateNodeConfig = useSimulationStore((s) => s.updateNodeConfig);
  const selectNode = useSimulationStore((s) => s.selectNode);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [selectedNodeId, nodes],
  );

  const { config, metrics, nodeType, label } = selectedNode?.data || {};

  const renderConfig = useCallback(() => {
    switch (nodeType) {
      case "client": {
        const c = config as any;
        return (
          <>
            <Field label="RPS">
              <NumberInput
                value={c.rps}
                onChange={(v) => updateNodeConfig(selectedNodeId!, { rps: v })}
                min={1}
                max={100000}
              />
            </Field>
            <Field label="Payload KB">
              <NumberInput
                value={c.payloadSizeKB}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { payloadSizeKB: v })
                }
                min={1}
                max={1024}
              />
            </Field>
            <Field label="Read Ratio">
              <NumberInput
                value={c.readWriteRatio}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, {
                    readWriteRatio: Math.min(1, Math.max(0, v)),
                  })
                }
                min={0}
                max={1}
                step={0.1}
              />
            </Field>
          </>
        );
      }
      case "loadBalancer": {
        const c = config as any;
        return (
          <Field label="Algorithm">
            <SelectInput
              value={c.algorithm}
              options={[
                { value: "round-robin", label: "Round Robin" },
                { value: "least-connections", label: "Least Connections" },
                { value: "ip-hash", label: "IP Hash" },
              ]}
              onChange={(v) =>
                updateNodeConfig(selectedNodeId!, {
                  algorithm: v as any,
                })
              }
            />
          </Field>
        );
      }
      case "apiGateway": {
        const c = config as any;
        return (
          <>
            <Field label="Rate Limit">
              <NumberInput
                value={c.rateLimitRps}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { rateLimitRps: v })
                }
                min={100}
                max={100000}
              />
            </Field>
            <Field label="Auth">
              <ToggleInput
                value={c.authEnabled}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { authEnabled: v })
                }
              />
            </Field>
          </>
        );
      }
      case "webServer": {
        const c = config as any;
        return (
          <>
            <Field label="Max Concurrent">
              <NumberInput
                value={c.maxConcurrent}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { maxConcurrent: v })
                }
                min={1}
                max={10000}
              />
            </Field>
            <Field label="Process Time ms">
              <NumberInput
                value={c.processingTimeMs}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { processingTimeMs: v })
                }
                min={1}
                max={10000}
              />
            </Field>
            <Field label="Failure Rate">
              <NumberInput
                value={c.failureRate}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, {
                    failureRate: Math.min(1, Math.max(0, v)),
                  })
                }
                min={0}
                max={1}
                step={0.01}
              />
            </Field>
          </>
        );
      }
      case "cache": {
        const c = config as any;
        return (
          <>
            <Field label="Size MB">
              <NumberInput
                value={c.sizeMB}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { sizeMB: v })
                }
                min={1}
                max={65536}
              />
            </Field>
            <Field label="TTL sec">
              <NumberInput
                value={c.ttlSec}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { ttlSec: v })
                }
                min={1}
                max={86400}
              />
            </Field>
            <Field label="Eviction">
              <SelectInput
                value={c.evictionPolicy}
                options={[
                  { value: "LRU", label: "LRU" },
                  { value: "LFU", label: "LFU" },
                ]}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, {
                    evictionPolicy: v as any,
                  })
                }
              />
            </Field>
            <Field label="Hit Rate">
              <NumberInput
                value={c.hitRate}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, {
                    hitRate: Math.min(1, Math.max(0, v)),
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </Field>
          </>
        );
      }
      case "sqlDb":
      case "noSqlDb": {
        const c = config as any;
        return (
          <>
            <Field label="Replication">
              <SelectInput
                value={c.replicationMode}
                options={[
                  { value: "single", label: "Single" },
                  { value: "master-slave", label: "Master-Slave" },
                ]}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, {
                    replicationMode: v as any,
                  })
                }
              />
            </Field>
            <Field label="Read Throughput">
              <NumberInput
                value={c.maxReadThroughput}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { maxReadThroughput: v })
                }
                min={1}
                max={100000}
              />
            </Field>
            <Field label="Write Throughput">
              <NumberInput
                value={c.maxWriteThroughput}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { maxWriteThroughput: v })
                }
                min={1}
                max={100000}
              />
            </Field>
            <Field label="Repl Lag ms">
              <NumberInput
                value={c.replicationLagMs}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { replicationLagMs: v })
                }
                min={0}
                max={10000}
              />
            </Field>
          </>
        );
      }
      case "messageQueue": {
        const c = config as any;
        return (
          <>
            <Field label="Max Queue">
              <NumberInput
                value={c.maxQueueSize}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { maxQueueSize: v })
                }
                min={100}
                max={1000000}
              />
            </Field>
            <Field label="Process Rate">
              <NumberInput
                value={c.processingRate}
                onChange={(v) =>
                  updateNodeConfig(selectedNodeId!, { processingRate: v })
                }
                min={1}
                max={100000}
              />
            </Field>
          </>
        );
      }
      default:
        return null;
    }
  }, [selectedNodeId, nodeType, config, updateNodeConfig]);

  const renderMetrics = () => {
    const m = metrics as any;
    switch (nodeType) {
      case "client":
        return (
          <>
            <MetricBar
              label="Total Sent"
              value={m.totalSent}
              max={10000}
              color="#fbbf24"
            />
            <MetricBar
              label="Failed"
              value={m.failedRequests}
              max={m.totalSent || 1}
              color="#ef4444"
            />
            <MetricBar
              label="Avg Latency"
              value={m.avgLatencyMs}
              max={500}
              unit="ms"
              color="#6366f1"
            />
          </>
        );
      case "loadBalancer":
        return (
          <MetricBar
            label="Active Connections"
            value={m.activeConnections}
            max={1000}
            color="#6366f1"
          />
        );
      case "apiGateway":
        return (
          <>
            <MetricBar
              label="Routed"
              value={m.requestsRouted}
              max={10000}
              color="#8b5cf6"
            />
            <MetricBar
              label="Blocked"
              value={m.requestsBlocked}
              max={1000}
              color="#ef4444"
            />
          </>
        );
      case "webServer":
        return (
          <>
            <MetricBar
              label="CPU Load"
              value={m.cpuLoad}
              max={100}
              unit="%"
              color="#3b82f6"
            />
            <MetricBar
              label="Queue"
              value={m.queueSize}
              max={(config as any).maxConcurrent * 2}
              color="#f59e0b"
            />
            <MetricBar
              label="Active Threads"
              value={m.activeThreads}
              max={(config as any).maxConcurrent}
              color="#10b981"
            />
          </>
        );
      case "cache":
        return (
          <>
            <MetricBar
              label="Hit Rate"
              value={Math.round(m.hitRate * 100)}
              max={100}
              unit="%"
              color="#10b981"
            />
            <MetricBar
              label="Size"
              value={m.currentSizeMB}
              max={(config as any).sizeMB}
              unit="MB"
              color="#f59e0b"
            />
          </>
        );
      case "sqlDb":
      case "noSqlDb":
        return (
          <>
            <MetricBar
              label="Connections"
              value={m.connectionsActive}
              max={(config as any).maxReadThroughput}
              color="#10b981"
            />
            <MetricBar
              label="Query Latency"
              value={m.queryLatencyMs}
              max={100}
              unit="ms"
              color="#6366f1"
            />
          </>
        );
      case "messageQueue":
        return (
          <>
            <MetricBar
              label="Queue Depth"
              value={m.queueDepth}
              max={(config as any).maxQueueSize}
              color="#ec4899"
            />
            <MetricBar
              label="Processed"
              value={m.processedCount}
              max={10000}
              color="#10b981"
            />
            <MetricBar
              label="Dead Letter"
              value={m.deadLettered}
              max={(config as any).maxQueueSize}
              color="#ef4444"
            />
          </>
        );
    }
  };

  const colorMap: Record<string, string> = {
    client: "#ffc285",
    loadBalancer: "#c4b5fd",
    apiGateway: "#a0c3ec",
    webServer: "#7d8187",
    cache: "#ff7a17",
    sqlDb: "#8b5cf6",
    noSqlDb: "#f97316",
    messageQueue: "#ec4899",
  };

  const panelLabel = selectedNode?.data.label || "Config";
  const panelType = selectedNode?.data.nodeType;

  const header = (
    <div className="flex items-center justify-between px-3 py-2 border-b border-hairline">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: colorMap[panelType || "webServer"] || "#64748b" }}
        />
        <span className="text-[11px] font-normal text-body-mid uppercase">{panelLabel}</span>
        {panelType && (
          <span className="text-[10px] text-body-mid uppercase">
            {panelType}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 hover:bg-white/5 rounded transition-colors"
          title={collapsed ? "Expand config panel" : "Collapse config panel"}
        >
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-body-mid" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-body-mid" />
          )}
        </button>
        <button
          onClick={() => selectNode(null)}
          className="p-1 hover:bg-white/5 rounded transition-colors"
        >
          <X className="h-3.5 w-3.5 text-body-mid" />
        </button>
      </div>
    </div>
  );

  if (!selectedNode || !nodeType) {
    return (
      <div className={`${collapsed ? "" : "flex-1 min-h-0"} flex flex-col overflow-hidden border-t border-hairline`}>
        {header}
        {!collapsed && (
          <div className="flex flex-col h-full items-center justify-center p-6 text-center">
            <Settings className="h-8 w-8 text-body-mid mb-3" />
            <p className="text-xs text-mute">
              Select a node on the canvas to view and edit its configuration
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${collapsed ? "" : "flex-1 min-h-0"} flex flex-col overflow-hidden border-t border-hairline`}>
      {header}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Settings className="h-3 w-3 text-body-mid" />
            <span className="text-[11px] font-normal uppercase tracking-wider text-body-mid">
              Configuration
            </span>
          </div>
          <div className="space-y-1.5">{renderConfig()}</div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <BarChart3 className="h-3 w-3 text-body-mid" />
            <span className="text-[11px] font-normal uppercase tracking-wider text-body-mid">
              Metrics
            </span>
          </div>
          <div className="space-y-1.5">{renderMetrics()}</div>
        </div>
        </div>
      )}
    </div>
  );
}
