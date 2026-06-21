/* eslint-disable @typescript-eslint/no-explicit-any */

import { Handle, Position, type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import type { SysCraftNodeData, NodeType } from "@/types/simulation";
import { Zap, Server, Database, HardDrive, Activity, GitBranch, Radio } from "lucide-react";
import PacketEdge from "./PacketEdge";

const nodeWidth = 160;
const nodeHeight = 90;
const nodeRadius = 8;

type LucideIcon = typeof Zap;

const colorMap: Record<NodeType, { bg: string; hover: string; border: string; icon: string }> = {
  client: { bg: "#191919", hover: "#1a1c20", border: "#7d8187", icon: "#ffc285" },
  loadBalancer: { bg: "#191919", hover: "#1a1c20", border: "#c4b5fd", icon: "#c4b5fd" },
  apiGateway: { bg: "#191919", hover: "#1a1c20", border: "#a0c3ec", icon: "#a0c3ec" },
  webServer: { bg: "#191919", hover: "#1a1c20", border: "#7d8187", icon: "#ffffff" },
  cache: { bg: "#191919", hover: "#1a1c20", border: "#ff7a17", icon: "#ff7a17" },
  sqlDb: { bg: "#191919", hover: "#1a1c20", border: "#7c3aed", icon: "#7c3aed" },
  noSqlDb: { bg: "#191919", hover: "#1a1c20", border: "#ff7a17", icon: "#ff7a17" },
  messageQueue: { bg: "#191919", hover: "#1a1c20", border: "#c4b5fd", icon: "#c4b5fd" },
};

const iconMap: Record<NodeType, LucideIcon> = {
  client: Zap,
  loadBalancer: Activity,
  apiGateway: GitBranch,
  webServer: Server,
  cache: HardDrive,
  sqlDb: Database,
  noSqlDb: Database,
  messageQueue: Radio,
};

function SysCraftNodeComponent({ data, selected }: NodeProps<Node<SysCraftNodeData>>) {
  const colors = colorMap[data.nodeType] || colorMap.client;
  const Icon = iconMap[data.nodeType] || Zap;
  const { getNode } = useReactFlow();
  
  const isClientNode = data.nodeType === "client";

  const renderMetrics = () => {
    const m = data.metrics as any;
    const c = data.config as any;
    switch (data.nodeType) {
      case "client":
        return (
          <>
            <span>RPS: {c.rps}</span>
            <span>Fail: {m.failedRequests}</span>
            <span>Lat: {m.avgLatencyMs}ms</span>
          </>
        );
      case "loadBalancer":
        return (
          <>
            <span>{c.algorithm.replace("-", " ")}</span>
            <span>Active: {m.activeConnections}</span>
          </>
        );
      case "apiGateway":
        return (
          <>
            <span>Rate: {c.rateLimitRps}</span>
            <span>Routed: {m.requestsRouted}</span>
          </>
        );
      case "webServer":
        return (
          <>
            <span>CPU: {m.cpuLoad}%</span>
            <span>Q: {m.queueSize}</span>
          </>
        );
      case "cache":
        return (
          <>
            <span>Hit: {(m.hitRate * 100).toFixed(0)}%</span>
            <span>{m.currentSizeMB}MB</span>
          </>
        );
      case "sqlDb":
      case "noSqlDb":
        return (
          <>
            <span>{c.replicationMode}</span>
            <span>Lag: {c.replicationLagMs}ms</span>
          </>
        );
      case "messageQueue":
        return (
          <>
            <span>Rate: {c.processingRate}/s</span>
            <span>Depth: {m.queueDepth}</span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: nodeWidth,
        height: nodeHeight,
        borderRadius: nodeRadius,
        background: colors.bg,
        border: selected ? `1.5px solid #ffffff` : `1px solid #212327`,
        transition: "border-color 100ms ease, box-shadow 100ms ease, background 100ms ease",
      }}
    >
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className={`node-handle ${isClientNode ? "invalid-target" : ""}`}
        style={{
          top: -5,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
        }}
      />
      <div className="flex flex-col h-full items-center justify-center p-2 text-center text-ink">
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3" style={{ color: colors.icon }} />
          <div className="text-sm font-normal max-w-full">
            {data.label}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-body-mid font-mono flex-wrap justify-center uppercase tracking-[1.2px]">
          {renderMetrics()}
        </div>
      </div>
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className="node-handle"
        style={{
          bottom: -5,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
}

const nodeTypes = {
  client: SysCraftNodeComponent,
  loadBalancer: SysCraftNodeComponent,
  apiGateway: SysCraftNodeComponent,
  webServer: SysCraftNodeComponent,
  cache: SysCraftNodeComponent,
  sqlDb: SysCraftNodeComponent,
  noSqlDb: SysCraftNodeComponent,
  messageQueue: SysCraftNodeComponent,
};

const edgeTypes = {
  packetEdge: PacketEdge,
};

export { nodeTypes, edgeTypes };
