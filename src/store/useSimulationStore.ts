/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { type Connection, type EdgeChange, type NodeChange, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import {
  type SysCraftNode,
  type SysCraftEdge,
  type Packet,
  type NodeType,
  type SimState,
  type Scenario,
  type ClientConfig,
  type LoadBalancerConfig,
  type ServerConfig,
  type CacheConfig,
  type DatabaseConfig,
  type ClientMetrics,
  type LoadBalancerMetrics,
  type ServerMetrics,
  type CacheMetrics,
  type DatabaseMetrics,
  type ApiGatewayConfig,
  type ApiGatewayMetrics,
  type MessageQueueConfig,
  type MessageQueueMetrics,
  type LBStrategy,
} from "@/types/simulation";

let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
let lastTickTime = 0;

function defaultConfig(nodeType: NodeType) {
  switch (nodeType) {
  case "client":
    return {
      rps: 100,
      payloadSizeKB: 4,
      readWriteRatio: 0.8,
    } as ClientConfig;
    case "loadBalancer":
      return {
        algorithm: "round-robin" as LBStrategy,
        rrIndex: 0,
      } as LoadBalancerConfig;
    case "apiGateway":
      return {
        rateLimitRps: 1000,
        authEnabled: true,
      } as ApiGatewayConfig;
    case "webServer":
      return {
        maxConcurrent: 50,
        processingTimeMs: 50,
        failureRate: 0.01,
        currentQueue: 0,
      } as ServerConfig;
    case "cache":
      return {
        sizeMB: 512,
        ttlSec: 300,
        evictionPolicy: "LRU" as const,
        hitRate: 0.8,
      } as CacheConfig;
    case "sqlDb":
      return {
        type: "sql" as const,
        replicationMode: "single" as const,
        maxReadThroughput: 500,
        maxWriteThroughput: 200,
        replicationLagMs: 0,
      } as DatabaseConfig;
    case "noSqlDb":
      return {
        type: "nosql" as const,
        replicationMode: "single" as const,
        maxReadThroughput: 2000,
        maxWriteThroughput: 1000,
        replicationLagMs: 0,
      } as DatabaseConfig;
    case "messageQueue":
      return {
        maxQueueSize: 10000,
        processingRate: 500,
      } as MessageQueueConfig;
  }
}

function defaultMetrics(nodeType: NodeType) {
  switch (nodeType) {
    case "client":
      return {
        totalSent: 0,
        failedRequests: 0,
        avgLatencyMs: 0,
      } as ClientMetrics;
    case "loadBalancer":
      return {
        connectionDistribution: {},
        activeConnections: 0,
      } as LoadBalancerMetrics;
    case "apiGateway":
      return {
        requestsRouted: 0,
        requestsBlocked: 0,
      } as ApiGatewayMetrics;
    case "webServer":
      return {
        cpuLoad: 0,
        queueSize: 0,
        activeThreads: 0,
        requestsHandled: 0,
        requestsFailed: 0,
      } as ServerMetrics;
    case "cache":
      return {
        hitRate: 0.8,
        currentSizeMB: 0,
        evictions: 0,
        avgLatencyMs: 1,
      } as CacheMetrics;
    case "sqlDb":
      return {
        diskIO: 0,
        queryLatencyMs: 10,
        replicationLagMs: 0,
        connectionsActive: 0,
      } as DatabaseMetrics;
    case "noSqlDb":
      return {
        diskIO: 0,
        queryLatencyMs: 5,
        replicationLagMs: 0,
        connectionsActive: 0,
      } as DatabaseMetrics;
    case "messageQueue":
      return {
        queueDepth: 0,
        processedCount: 0,
        deadLettered: 0,
      } as MessageQueueMetrics;
  }
}

// ── Default label map ─────────────────────────────────────────────────
const nodeLabel: Record<NodeType, string> = {
  client: "Client",
  loadBalancer: "LB",
  apiGateway: "API Gateway",
  webServer: "Web Server",
  cache: "Cache",
  sqlDb: "SQL DB",
  noSqlDb: "NoSQL DB",
  messageQueue: "Message Queue",
};

// ── Pre-built Scenarios ───────────────────────────────────────────────
const SCENARIOS: Record<string, Scenario> = {
  "horizontal-scaling": {
    id: "horizontal-scaling",
    name: "Horizontal Scaling",
    description: "1 Server crashin",
    goal: "Drop a Load Balancer, spin up 3 Web Servers, and distribute the load to handle 10,000 RPS.",
    hints: [
      "Add a Load Balancer between the Client and Servers",
      "Create 2–3 Web Server",
      "Connect the LB to all Servers",
      "Set LB algorithm to round-robin",
    ],
    nodes: [
      {
        id: "scenario-client",
        type: "client",
        position: { x: 100, y: 300 },
        data: {
          nodeType: "client",
          label: "Client",
          config: { rps: 10000, payloadSizeKB: 4, readWriteRatio: 0.8 },
          metrics: defaultMetrics("client"),
        },
      },
      {
        id: "scenario-server",
        type: "webServer",
        position: { x: 500, y: 300 },
        data: {
          nodeType: "webServer",
          label: "Web Server",
          config: { maxConcurrent: 10, processingTimeMs: 200, failureRate: 0.5, currentQueue: 0 },
          metrics: defaultMetrics("webServer"),
        },
      },
    ],
    edges: [
      {
        id: "scenario-edge-1",
        source: "scenario-client",
        target: "scenario-server",
        type: "packetEdge",
        sourceHandle: "bottom-source",
        targetHandle: "top-target",
      },
    ],
  },
  "database-caching": {
    id: "database-caching",
    name: "Database Caching",
    description: "DB has massive read latency",
    goal: "Intercept reads by placing a Cache node before the DB and configuring a proper TTL.",
    hints: [
      "Drag a Cache node between the Server and DB",
      "Set Cache TTL to 300s",
      "Connect Server → Cache → DB",
    ],
    nodes: [
      {
        id: "sc-client",
        type: "client",
        position: { x: 100, y: 300 },
        data: {
          nodeType: "client",
          label: "Client",
          config: { rps: 500, payloadSizeKB: 4, readWriteRatio: 0.9 },
          metrics: defaultMetrics("client"),
        },
      },
      {
        id: "sc-server",
        type: "webServer",
        position: { x: 400, y: 300 },
        data: {
          nodeType: "webServer",
          label: "Web Server",
          config: { maxConcurrent: 100, processingTimeMs: 20, failureRate: 0.01, currentQueue: 0 },
          metrics: defaultMetrics("webServer"),
        },
      },
      {
        id: "sc-db",
        type: "sqlDb",
        position: { x: 750, y: 300 },
        data: {
          nodeType: "sqlDb",
          label: "SQL DB",
          config: { type: "sql", replicationMode: "single", maxReadThroughput: 100, maxWriteThroughput: 50, replicationLagMs: 0 },
          metrics: defaultMetrics("sqlDb"),
        },
      },
    ],
    edges: [
      { id: "sce1", source: "sc-client", target: "sc-server", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "sce2", source: "sc-server", target: "sc-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
    ],
  },
  "single-point-of-failure": {
    id: "single-point-of-failure",
    name: "Single Point of Failure",
    description: "Design a system that survives a DB node crash",
    goal: "Set up Master-Slave replication on the DB so the system survives a primary node crash.",
    hints: [
      "Create a second SQL DB node",
      "Set one DB to Master-Slave replication mode",
      "Connect the second DB as a slave",
    ],
    nodes: [
      {
        id: "spof-client",
        type: "client",
        position: { x: 100, y: 100 },
        data: {
          nodeType: "client",
          label: "Client",
          config: { rps: 200, payloadSizeKB: 4, readWriteRatio: 0.7 },
          metrics: defaultMetrics("client"),
        },
      },
      {
        id: "spof-lb",
        type: "loadBalancer",
        position: { x: 350, y: 100 },
        data: {
          nodeType: "loadBalancer",
          label: "LB",
          config: { algorithm: "round-robin", rrIndex: 0 },
          metrics: defaultMetrics("loadBalancer"),
        },
      },
      {
        id: "spof-server1",
        type: "webServer",
        position: { x: 600, y: 50 },
        data: {
          nodeType: "webServer",
          label: "Web Server 1",
          config: { maxConcurrent: 50, processingTimeMs: 30, failureRate: 0.02, currentQueue: 0 },
          metrics: defaultMetrics("webServer"),
        },
      },
      {
        id: "spof-server2",
        type: "webServer",
        position: { x: 600, y: 200 },
        data: {
          nodeType: "webServer",
          label: "Web Server 2",
          config: { maxConcurrent: 50, processingTimeMs: 30, failureRate: 0.02, currentQueue: 0 },
          metrics: defaultMetrics("webServer"),
        },
      },
      {
        id: "spof-db",
        type: "sqlDb",
        position: { x: 850, y: 130 },
        data: {
          nodeType: "sqlDb",
          label: "SQL DB (Primary)",
          config: { type: "sql", replicationMode: "single", maxReadThroughput: 500, maxWriteThroughput: 200, replicationLagMs: 0 },
          metrics: defaultMetrics("sqlDb"),
        },
      },
    ],
    edges: [
      { id: "se1", source: "spof-client", target: "spof-lb", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "se2", source: "spof-lb", target: "spof-server1", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "se3", source: "spof-lb", target: "spof-server2", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "se4", source: "spof-server1", target: "spof-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "se5", source: "spof-server2", target: "spof-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
    ],
  },
};

const TERMINAL_PACKET_STATUSES = new Set<Packet["status"]>(["success", "error", "timeout"]);
const MAX_PACKETS = 800;
const MAX_PACKET_HISTORY_TICKS = 200;
const MAX_SPAWN_PER_TICK = 32;

function resetNodeMetrics(nodes: SysCraftNode[]) {
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, metrics: defaultMetrics(n.data.nodeType) },
  }));
}

function resetSimulationState(logs: string[]) {
  return {
    isRunning: false,
    speed: 1 as 1 | 2 | 5,
    tickCount: 0,
    globalTime: 0,
    logs,
  };
}

// ── Helper: pick a downstream node based on LB strategy ───────────────
function pickDownstream(
  node: SysCraftNode,
  edges: SysCraftEdge[],
  nodes: SysCraftNode[],
  sourceHandleHint?: string,
): SysCraftNode | null {
  const nodeType = node.data.nodeType;
  const outEdges = edges.filter((e) => {
    if (e.source !== node.id) return false;
    if (sourceHandleHint && e.sourceHandle && e.sourceHandle !== sourceHandleHint) return false;
    return true;
  });
  if (outEdges.length === 0) return null;
  const targets = outEdges
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is SysCraftNode => n !== undefined);

  if (nodeType === "loadBalancer") {
    const cfg = node.data.config as LoadBalancerConfig;
    const connectedServers = targets.filter(
      (n) => n.data.nodeType === "webServer",
    );
    if (connectedServers.length === 0) return targets[0] ?? null;

    switch (cfg.algorithm) {
      case "round-robin": {
        const idx = cfg.rrIndex % connectedServers.length;
        return connectedServers[idx];
      }
      case "least-connections": {
        return connectedServers.sort(
          (a, b) =>
            (a.data.metrics as ServerMetrics).activeThreads -
            (b.data.metrics as ServerMetrics).activeThreads,
        )[0];
      }
      case "ip-hash": {
        const nextId = targets.findIndex((n) => n.data.nodeType === "webServer");
        return connectedServers[nextId % connectedServers.length];
      }
      default:
        return connectedServers[0];
    }
  }

  // Default: pick first connected node
return targets[0] ?? null;
}

// ── Helper: route packet through the node graph ───────────────────────
function processPacket(
  packet: Packet,
  nodes: SysCraftNode[],
  edges: SysCraftEdge[],
): Packet {
  const currentNode = nodes.find((n) => n.id === packet.path[packet.path.length - 1]);
  if (!currentNode) return { ...packet, status: "error" };

  const arrivedViaEdge = edges.find((e) => e.id === packet.currentEdgeId);
  const arrivedAtHandleId = arrivedViaEdge?.targetHandle ?? null;

  const getSourceHandleFor = (targetHandle: string | null): string | null => {
    if (!targetHandle) return null;
    if (targetHandle === "bottom-target" || targetHandle === "top-target" || targetHandle === "left-target") return null;
    if (targetHandle.includes("bottom")) return "bottom-source";
    if (targetHandle.includes("top")) return "top-source";
    if (targetHandle.includes("left")) return null;
    if (targetHandle.includes("right")) return "right-source";
    return null;
  };

  const inferSourceHandle = (fromTargetHandle: string | null): string | null => {
    if (!fromTargetHandle) return null;
    if (fromTargetHandle === "top-target") return "top-source";
    if (fromTargetHandle === "bottom-target") return "bottom-source";
    if (fromTargetHandle === "left-target") return null;
    return null;
  };

  const outSourceHint = inferSourceHandle(arrivedAtHandleId);

  const nodeType = currentNode.data.nodeType;
  if (nodeType === "client") {
    const next = pickDownstream(currentNode, edges, nodes, outSourceHint ?? undefined);
    if (!next) {
      return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
    }
    const nextEdge = edges.find((e) => e.source === currentNode.id && e.target === next.id && (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint));
    return {
      ...packet,
      path: [...packet.path, next.id],
      currentEdgeId: nextEdge?.id ?? `${currentNode.id}-${next.id}`,
      edgeProgress: 0,
    };
  }

  if (nodeType === "loadBalancer") {
    const cfg = currentNode.data.config as LoadBalancerConfig;
    const allOutEdges = edges.filter((e) => e.source === currentNode.id);
    const connectedServers = allOutEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is SysCraftNode => n !== undefined && n.data.nodeType === "webServer");

    let next: SysCraftNode | null;
    let nextEdge: SysCraftEdge | undefined;

    if (connectedServers.length > 0) {
      switch (cfg.algorithm) {
        case "round-robin": {
          const idx = cfg.rrIndex % connectedServers.length;
          next = connectedServers[idx];
          break;
        }
        case "least-connections": {
          next = connectedServers.sort(
            (a, b) =>
              (a.data.metrics as ServerMetrics).activeThreads -
              (b.data.metrics as ServerMetrics).activeThreads,
          )[0];
          break;
        }
        case "ip-hash": {
          const nextId = allOutEdges.findIndex((e) => nodes.find((n) => n.id === e.target)?.data.nodeType === "webServer");
          next = connectedServers[nextId % connectedServers.length];
          break;
        }
        default:
          next = connectedServers[0];
      }
      nextEdge = allOutEdges.find((e) => e.target === next!.id);
    } else {
      const fallbackTargets = allOutEdges
        .map((e) => ({ edge: e, node: nodes.find((n) => n.id === e.target) }))
        .filter((t): t is { edge: SysCraftEdge; node: SysCraftNode } => t.node !== undefined);
      next = fallbackTargets[0]?.node ?? null;
      nextEdge = fallbackTargets[0]?.edge;
    }

    if (!next) {
      return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
    }
    return {
      ...packet,
      path: [...packet.path, next.id],
      currentEdgeId: nextEdge?.id ?? `${currentNode.id}-${next.id}`,
      edgeProgress: 0,
    };
  }

  if (nodeType === "webServer") {
    const cfg = currentNode.data.config as ServerConfig;
    const metrics = currentNode.data.metrics as ServerMetrics;
    const queueFull = metrics.queueSize >= cfg.maxConcurrent;
    const shouldFail = Math.random() < cfg.failureRate;

    if (queueFull || shouldFail) {
      return {
        ...packet,
        status: "error",
        latencyAccMs: packet.latencyAccMs + cfg.processingTimeMs,
      };
    }

    if (packet.requestType === "read") {
      const cacheEdgeCandidates = edges.filter(
        (e) => e.source === currentNode.id && (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint),
      );
      const cacheEdge = cacheEdgeCandidates.find(
        (e) => nodes.find((n) => n.id === e.target)?.data.nodeType === "cache",
      );
      if (cacheEdge) {
        const cacheNode = nodes.find((n) => n.id === cacheEdge.target);
        if (cacheNode) {
          const cacheCfg = cacheNode.data.config as CacheConfig;
          const isHit = Math.random() < cacheCfg.hitRate;
          return {
            ...packet,
            path: [...packet.path, cacheNode.id],
            currentEdgeId: cacheEdge.id,
            edgeProgress: 0,
            status: isHit ? "hit" : "miss",
            latencyAccMs: packet.latencyAccMs + (isHit ? 1 : 5),
          };
        }
      }
    }

    const dbEdgeCandidates = edges.filter(
      (e) => e.source === currentNode.id && (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint),
    );
    const dbTargets = dbEdgeCandidates
      .map((e) => ({ edge: e, node: nodes.find((n) => n.id === e.target) }))
      .filter((t) => t.node && (t.node.data.nodeType === "sqlDb" || t.node.data.nodeType === "noSqlDb"));

    if (dbTargets.length > 0 && dbTargets[0].node) {
      const db = dbTargets[0].node;
      return {
        ...packet,
        path: [...packet.path, db.id],
        currentEdgeId: dbTargets[0].edge.id,
        edgeProgress: 0,
        latencyAccMs: packet.latencyAccMs + cfg.processingTimeMs,
      };
    }

    return {
      ...packet,
      status: "success",
      latencyAccMs: packet.latencyAccMs + cfg.processingTimeMs,
    };
  }

  if (nodeType === "cache") {
    const serverNodeId = packet.path[packet.path.length - 2];
    const serverNode = nodes.find((n) => n.id === serverNodeId);
    const backEdgeId = serverNode
      ? edges.find((e) => e.source === serverNodeId && e.target === currentNode.id)?.id
      : null;

    if (packet.status === "hit" && backEdgeId) {
      return {
        ...packet,
        path: [...packet.path, serverNodeId],
        currentEdgeId: `${currentNode.id}-${serverNodeId}`,
        edgeProgress: 0,
        status: "success",
        latencyAccMs: packet.latencyAccMs + 1,
      };
    }

    const dbEdgeCandidates = edges.filter(
      (e) => e.source === currentNode.id,
    );
    const dbTargets = dbEdgeCandidates
      .map((e) => ({ edge: e, node: nodes.find((n) => n.id === e.target) }))
      .filter((t) => t.node && (t.node.data.nodeType === "sqlDb" || t.node.data.nodeType === "noSqlDb"));

    if (dbTargets.length > 0 && dbTargets[0].node) {
      return {
        ...packet,
        path: [...packet.path, dbTargets[0].node.id],
        currentEdgeId: dbTargets[0].edge.id,
        edgeProgress: 0,
        latencyAccMs: packet.latencyAccMs + 1,
      };
    }
    return { ...packet, status: "success", latencyAccMs: packet.latencyAccMs + 1 };
  }

  if (nodeType === "sqlDb" || nodeType === "noSqlDb") {
    const cfg = currentNode.data.config as DatabaseConfig;
    const dbLatency = nodeType === "sqlDb" ? 10 : 5;
    const isAtLimit = (() => {
      if (packet.requestType === "read") {
        return (currentNode.data.metrics as DatabaseMetrics).connectionsActive > cfg.maxReadThroughput;
      }
      return (currentNode.data.metrics as DatabaseMetrics).connectionsActive > cfg.maxWriteThroughput;
    })();
    if (isAtLimit) {
      return { ...packet, status: "timeout", latencyAccMs: packet.latencyAccMs + dbLatency + 100 };
    }
    return {
      ...packet,
      status: "success",
      latencyAccMs: packet.latencyAccMs + dbLatency + (cfg.replicationLagMs || 0),
    };
  }

  if (nodeType === "apiGateway") {
    const cfg = currentNode.data.config as ApiGatewayConfig;
    if (cfg.rateLimitRps > 0) {
      const rateLimitPerTick = cfg.rateLimitRps / 60;
      const activePacketsAtGateway = [packet].filter((p) => p.path.includes(currentNode.id) && !TERMINAL_PACKET_STATUSES.has(p.status)).length;
      if (activePacketsAtGateway >= rateLimitPerTick) {
        return {
          ...packet,
          status: "timeout",
          latencyAccMs: packet.latencyAccMs + 5,
        };
      }
    }
    const next = pickDownstream(currentNode, edges, nodes, outSourceHint ?? undefined);
    if (!next) {
      return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
    }
    const nextEdge = edges.find((e) => e.source === currentNode.id && e.target === next.id && (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint));
    return {
      ...packet,
      path: [...packet.path, next.id],
      currentEdgeId: nextEdge?.id ?? `${currentNode.id}-${next.id}`,
      edgeProgress: 0,
      latencyAccMs: packet.latencyAccMs + 2,
    };
  }

  if (nodeType === "messageQueue") {
    const cfg = currentNode.data.config as MessageQueueConfig;
    const metrics = currentNode.data.metrics as MessageQueueMetrics;
    const processingTime = 1000 / cfg.processingRate;

    if (metrics.queueDepth >= cfg.maxQueueSize) {
      return { ...packet, status: "timeout", latencyAccMs: packet.latencyAccMs + 5 };
    }

    const next = pickDownstream(currentNode, edges, nodes, outSourceHint ?? undefined);
    if (!next) {
      return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
    }
    const nextEdge = edges.find((e) => e.source === currentNode.id && e.target === next.id && (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint));
    return {
      ...packet,
      path: [...packet.path, next.id],
      currentEdgeId: nextEdge?.id ?? `${currentNode.id}-${next.id}`,
      edgeProgress: 0,
      latencyAccMs: packet.latencyAccMs + processingTime,
    };
  }

  return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
}

// ── Helper: update metrics per node each tick ─────────────────────────
function updateNodeMetrics(nodes: SysCraftNode[], packets: Packet[]): SysCraftNode[] {
  return nodes.map((node) => {
    const m = { ...node.data.metrics };

    switch (node.data.nodeType) {
      case "client": {
        const cm = m as ClientMetrics;
        const nodePackets = packets.filter(
          (p) => p.path[0] === node.id && p.status !== "created",
        );
        cm.totalSent = nodePackets.length;
        cm.failedRequests = nodePackets.filter((p) => p.status === "error" || p.status === "timeout").length;
        const successLatencies = nodePackets
          .filter((p) => p.status === "success" || p.status === "error")
          .map((p) => p.latencyAccMs);
        cm.avgLatencyMs =
          successLatencies.length > 0
            ? Math.round(successLatencies.reduce((a, b) => a + b, 0) / successLatencies.length)
            : 0;
        break;
      }
      case "loadBalancer": {
        const lm = m as LoadBalancerMetrics;
        const nodePackets = packets.filter((p) => p.path.includes(node.id));
        lm.activeConnections = nodePackets.length;
        break;
      }
      case "webServer": {
        const sm = m as ServerMetrics;
        const cfg = node.data.config as ServerConfig;
        const nodePackets = packets.filter((p) => p.path.includes(node.id));
        sm.activeThreads = Math.min(nodePackets.length, cfg.maxConcurrent);
        sm.queueSize = Math.max(0, nodePackets.length - cfg.maxConcurrent);
        sm.cpuLoad = Math.min(100, Math.round((sm.activeThreads / cfg.maxConcurrent) * 100));
        sm.requestsHandled = nodePackets.filter((p) => p.status === "success").length;
        sm.requestsFailed = nodePackets.filter((p) => p.status === "error").length;
        break;
      }
      case "cache": {
        const cchm = m as CacheMetrics;
        const cfg = node.data.config as CacheConfig;
        const nodePackets = packets.filter((p) => p.path.includes(node.id));
        const hits = nodePackets.filter((p) => p.status === "hit").length;
        const total = nodePackets.length;
        cchm.hitRate = total > 0 ? hits / total : cfg.hitRate;
        cchm.currentSizeMB = Math.min(cfg.sizeMB, Math.round(nodePackets.length * 0.1));
        break;
      }
      case "sqlDb":
      case "noSqlDb": {
        const dm = m as DatabaseMetrics;
        const nodePackets = packets.filter((p) => p.path.includes(node.id));
        dm.connectionsActive = nodePackets.length;
        dm.queryLatencyMs = node.data.nodeType === "sqlDb" ? 10 : 5;
        if (nodePackets.length > 200) dm.queryLatencyMs += 20;
        break;
      }
      case "messageQueue": {
        const qm = m as MessageQueueMetrics;
        const cfg = node.data.config as MessageQueueConfig;
        const nodePackets = packets.filter((p) => p.path.includes(node.id));
        qm.queueDepth = nodePackets.length;
        qm.processedCount = nodePackets.filter((p) => p.status === "success").length;
        qm.deadLettered = Math.min(cfg.maxQueueSize, Math.max(0, nodePackets.length - cfg.maxQueueSize));
        break;
      }
    }

    return { ...node, data: { ...node.data, metrics: m } };
  });
}

// ── The Store ─────────────────────────────────────────────────────────
export interface SysCraftStore {
  // React Flow
  nodes: SysCraftNode[];
  edges: SysCraftEdge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // Simulation
  simulation: SimState;
  packets: Packet[];

  // UI
  activeScenario: string | null;
  showScenarioPanel: boolean;

  // Actions — Canvas
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedEdgeIds: (ids: string[]) => void;
  removeEdge: (id: string) => void;
  updateNodeConfig: (id: string, config: any) => void;

  // Actions — Simulation
  playSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  setSpeed: (speed: 1 | 2 | 5) => void;
  tick: () => void;
  spawnTrafficSpike: (multiplier: number) => void;

  // Actions — Scenarios
  loadScenario: (id: string) => void;
  clearScenario: () => void;
  scenarios: typeof SCENARIOS;

  // Actions — Log
  addLog: (msg: string) => void;
}

export const useSimulationStore = create<SysCraftStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],

  simulation: {
    isRunning: false,
    speed: 1,
    tickCount: 0,
    globalTime: 0,
    logs: ["Welcome to SysCraft — System Design Simulator. Drag components to start designing."],
  },
  packets: [],

  activeScenario: null,
  showScenarioPanel: false,
  scenarios: SCENARIOS,

  // ── Canvas actions ──
  onNodesChange: (changes: NodeChange[]) => {
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes) as SysCraftNode[],
    }));
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges) as SysCraftEdge[],
    }));
  },

  onConnect: (connection: Connection) => {
    const sh = connection.sourceHandle ?? "bottom-source";
    const th = connection.targetHandle ?? "top-target";
    set((s) => ({
      edges: [
        ...s.edges,
        {
          ...connection,
          id: `${connection.source}-${sh}-${connection.target}-${th}`,
          type: "packetEdge",
          sourceHandle: sh,
          targetHandle: th,
        } as SysCraftEdge,
      ],
    }));
    get().addLog(`Connected ${connection.source} → ${connection.target}`);
  },

  addNode: (nodeType, position) => {
    const id = `${nodeType}-${Date.now()}`;
    const newNode: SysCraftNode = {
      id,
      type: nodeType,
      position,
      data: {
        nodeType,
        label: nodeLabel[nodeType],
        config: defaultConfig(nodeType),
        metrics: defaultMetrics(nodeType),
      },
    };
    set((s) => ({ nodes: [...s.nodes, newNode] }));
    get().addLog(`Added ${nodeLabel[nodeType]} node`);
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      packets: s.packets.filter(
        (p) => !p.path.includes(id) && p.path[0] !== id,
      ),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
    get().addLog(`Removed node ${id}`);
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  setSelectedNodeIds: (ids) => {
    set({ selectedNodeIds: ids, selectedNodeId: ids.length === 1 ? ids[0] : null });
  },

  setSelectedEdgeIds: (ids) => {
    set({ selectedEdgeIds: ids });
  },

  removeEdge: (id) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
    }));
    get().addLog(`Removed edge ${id}`);
  },

  updateNodeConfig: (id, config) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n,
      ),
    }));
    get().addLog(`Updated config for ${id}`);
  },

// ── Simulation actions ──
  playSimulation: () => {
    if (get().nodes.length === 0) return;
    if (rafId) return;
    const tickRate = 1000 / 20;
    lastTickTime = performance.now();
    set((s) => ({
      simulation: { ...s.simulation, isRunning: true },
    }));
    get().addLog("▶ Simulation started");
    const loop = (now: number) => {
      if (!get().simulation.isRunning) return;
      const delta = now - lastTickTime;
      if (delta >= tickRate) {
        lastTickTime = now - (delta % tickRate);
        get().tick();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  },

  pauseSimulation: () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    const wasRunning = get().simulation.isRunning;
    set((s) => ({
      simulation: { ...s.simulation, isRunning: false },
    }));
    if (wasRunning) {
      get().addLog("⏸ Simulation paused");
    }
  },

  stopSimulation: () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    const logs = get().simulation.logs;
    const nodes = get().nodes;
    set({
      simulation: resetSimulationState(logs),
      packets: [],
      nodes: resetNodeMetrics(nodes),
    });
    get().addLog("⏹ Simulation stopped");
  },

  setSpeed: (speed) => {
    set((s) => ({
      simulation: { ...s.simulation, speed },
    }));
    get().addLog(`Speed set to ${speed}×`);
  },

  tick: () => {
    if (!get().simulation.isRunning) return;

    const { nodes, edges, packets, simulation } = get();
    const speed = simulation.speed;

    // 1) Spawn new packets from client nodes
    const clientNodes = nodes.filter((n) => n.data.nodeType === "client");
    const newPackets: Packet[] = [];
    let spawned = 0;
    for (const client of clientNodes) {
      const remainingBudget = MAX_PACKETS - packets.length - spawned;
      if (remainingBudget <= 0) break;

      const cfg = client.data.config as ClientConfig;
      const spawnRatePerTick = speed === 1 ? cfg.rps / 60 : speed === 2 ? cfg.rps / 30 : cfg.rps / 12;
      const spawnCount = Math.min(
        MAX_SPAWN_PER_TICK,
        remainingBudget,
        Math.max(0, Math.ceil(spawnRatePerTick)),
      );
      for (let i = 0; i < spawnCount; i++) {
        const isRead = Math.random() < cfg.readWriteRatio;
        const packet: Packet = {
          id: uuidv4(),
          sourceNodeId: client.id,
          targetNodeId: "",
          requestType: isRead ? "read" : "write",
          status: "created",
          createdAt: simulation.tickCount,
          path: [client.id],
          edgeProgress: 0,
          currentEdgeId: null,
          latencyAccMs: 0,
        };
        newPackets.push(packet);
      }
      spawned += spawnCount;
    }

    // 2) Advance existing packets
    const advancedPackets = packets.map((p) => {
      if (TERMINAL_PACKET_STATUSES.has(p.status)) {
        return p;
      }

      const currentEdge = edges.find((e) => e.id === p.currentEdgeId);
      const sourceNode = currentEdge ? nodes.find((n) => n.id === currentEdge.source) : null;
      const targetNode = currentEdge ? nodes.find((n) => n.id === currentEdge.target) : null;
      const edgeLength = sourceNode && targetNode
        ? Math.hypot(targetNode.position.x - sourceNode.position.x, targetNode.position.y - sourceNode.position.y)
        : 100;
      const edgeProgressIncrement = (speed * 0.25) / Math.max(1, edgeLength / 100);
      const edgeProgress = p.edgeProgress + edgeProgressIncrement;
      if (edgeProgress >= 1.0) {
        const processed = processPacket(p, nodes, edges);
        return { ...processed, edgeProgress: 0 };
      }
      return { ...p, edgeProgress };
    });

    // 3) Remove stale completed packets; keep in-flight and recent history
    const allPackets = [...newPackets, ...advancedPackets].filter((p) => {
      if (TERMINAL_PACKET_STATUSES.has(p.status)) {
        return simulation.tickCount - p.createdAt < MAX_PACKET_HISTORY_TICKS;
      }
      return true;
    });
    const overflow = allPackets.length - MAX_PACKETS;
    const trimmedPackets = overflow > 0 ? allPackets.slice(overflow) : allPackets;

    // 4) Update node metrics
    const updatedNodes = updateNodeMetrics(nodes, trimmedPackets);

    // 5) Update config fields that change at runtime
    const finalNodes = updatedNodes.map((n) => {
      if (n.data.nodeType === "loadBalancer") {
        const cfg = n.data.config as LoadBalancerConfig;
        const outEdges = edges.filter((e) => e.source === n.id);
        const rrIndex = (cfg.rrIndex + 1) % Math.max(outEdges.length, 1);
        return {
          ...n,
          data: {
            ...n.data,
            config: { ...cfg, rrIndex },
            metrics: {
              ...n.data.metrics,
              connectionDistribution: outEdges.reduce<Record<string, number>>((acc, e, i) => {
                const targetId = e.target;
                const prev = acc[targetId] || 0;
                const count = i === (cfg.rrIndex % Math.max(outEdges.length, 1)) ? prev + 1 : prev;
                acc[targetId] = count;
                return acc;
              }, {}),
            } as LoadBalancerMetrics,
          },
        };
      }
      if (n.data.nodeType === "webServer") {
        const cfg = n.data.config as ServerConfig;
        return {
          ...n,
          data: {
            ...n.data,
            config: {
              ...cfg,
              currentQueue: (n.data.metrics as ServerMetrics).queueSize,
            },
          },
        };
      }
      return n;
    });

    set({
      packets: trimmedPackets,
      nodes: finalNodes,
      simulation: {
        ...simulation,
        tickCount: simulation.tickCount + 1,
        globalTime: simulation.globalTime + 100 * speed,
      },
    });
  },

  spawnTrafficSpike: (multiplier) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.data.nodeType === "client") {
          const cfg = n.data.config as ClientConfig;
          return {
            ...n,
            data: {
              ...n.data,
              config: { ...cfg, rps: cfg.rps * multiplier },
            },
          };
        }
        return n;
      }),
    }));
    get().addLog(`⚡ Traffic spike! RPS multiplied by ${multiplier}`);
    // Spike auto-decays after 5 ticks
    setTimeout(() => {
      const state = get();
      set({
        nodes: state.nodes.map((n) => {
          if (n.data.nodeType === "client") {
            const cfg = n.data.config as ClientConfig;
            return {
              ...n,
              data: {
                ...n.data,
                config: { ...cfg, rps: Math.round(cfg.rps / multiplier) },
              },
            };
          }
          return n;
        }),
      });
      get().addLog("Traffic spike subsided");
    }, 5000);
  },

// ── Scenarios ──
loadScenario: (id) => {
  const scenario = SCENARIOS[id];
  if (!scenario) return;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  set({
    nodes: JSON.parse(JSON.stringify(scenario.nodes)),
    edges: JSON.parse(JSON.stringify(scenario.edges)),
    selectedNodeId: null,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    activeScenario: id,
    showScenarioPanel: true,
    packets: [],
    simulation: {
      isRunning: false,
      speed: 1,
      tickCount: 0,
      globalTime: 0,
      logs: [`📚 Loaded scenario: ${scenario.name}. ${scenario.goal}`],
    },
  });
},

clearScenario: () => {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  set({
    activeScenario: null,
    showScenarioPanel: false,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    packets: [],
    simulation: {
      isRunning: false,
      speed: 1,
      tickCount: 0,
      globalTime: 0,
      logs: ["Canvas cleared. Drag components to start designing."],
    },
  });
},

  addLog: (msg) => {
    set((s) => ({
      simulation: {
        ...s.simulation,
        logs: [...s.simulation.logs.slice(-99), `[T${s.simulation.tickCount}] ${msg}`],
      },
    }));
  },
}));