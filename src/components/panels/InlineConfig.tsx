/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import type { NodeType } from "@/types/simulation";

export function InlineConfig({ nodeId, nodeType, config }: { nodeId: string; nodeType: NodeType; config: any }) {
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
