/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type SysCraftNode,
  type Packet,
  type ClientMetrics,
  type LoadBalancerMetrics,
  type ServerMetrics,
  type CacheMetrics,
  type ApiGatewayMetrics,
  type DatabaseMetrics,
  type MessageQueueMetrics,
  type ServerConfig,
  type CacheConfig,
  type DatabaseConfig,
  type MessageQueueConfig,
  type ApiGatewayConfig,
} from "@/types/simulation";
import { isTerminalPacket } from "./packetProcessor";

export function updateNodeMetrics(nodes: SysCraftNode[], packets: Packet[]): SysCraftNode[] {
  const pathIndex = new Map<string, { incoming: number; total: number; errorTimeout: number; success: number }>();
  const activePacketByNode = new Map<string, Packet[]>();
  const terminalPacketByNode = new Map<string, Packet[]>();

  for (const p of packets) {
    if (p.path.length === 0) continue;
    const currentNodeId = p.path[p.path.length - 1];
    const sourceNodeId = p.path[0];
    const isTerminal = isTerminalPacket(p);

    if (isTerminal) {
      if (!terminalPacketByNode.has(currentNodeId)) {
        terminalPacketByNode.set(currentNodeId, []);
      }
      terminalPacketByNode.get(currentNodeId)!.push(p);
    } else {
      if (!activePacketByNode.has(currentNodeId)) {
        activePacketByNode.set(currentNodeId, []);
      }
      activePacketByNode.get(currentNodeId)!.push(p);
    }

    if (p.status !== "created") {
      if (!pathIndex.has(sourceNodeId)) {
        pathIndex.set(sourceNodeId, { incoming: 0, total: 0, errorTimeout: 0, success: 0 });
      }
      const entry = pathIndex.get(sourceNodeId)!;
      entry.total++;
      if (p.status === "error" || p.status === "timeout") {
        entry.errorTimeout++;
      }
      if (p.status === "success") {
        entry.success++;
      }
    }
  }

  return nodes.map((node) => {
    const m = { ...node.data.metrics };

    switch (node.data.nodeType) {
      case "client": {
        const cm = m as ClientMetrics;
        const path = pathIndex.get(node.id);
        if (path) {
          cm.totalSent = path.total;
          cm.failedRequests = path.errorTimeout;
          // Calculate average latency for successfully completed requests originating from this client
          const clientSuccessPackets = packets.filter(
            (p) => p.sourceNodeId === node.id && p.status === "success"
          );
          cm.avgLatencyMs = clientSuccessPackets.length > 0
            ? Math.round(clientSuccessPackets.reduce((a, b) => a + b.latencyAccMs, 0) / clientSuccessPackets.length)
            : 0;
        } else {
          cm.totalSent = 0;
          cm.failedRequests = 0;
          cm.avgLatencyMs = 0;
        }
        break;
      }
      case "loadBalancer": {
        const lm = m as LoadBalancerMetrics;
        const activePackets = activePacketByNode.get(node.id) || [];
        lm.activeConnections = activePackets.length;
        break;
      }
      case "webServer": {
        const sm = m as ServerMetrics;
        const cfg = node.data.config as ServerConfig;
        const activePackets = activePacketByNode.get(node.id) || [];
        const terminalPackets = terminalPacketByNode.get(node.id) || [];

        // Active threads and queues only reflect active, non-terminated packets
        sm.activeThreads = Math.min(activePackets.length, cfg.maxConcurrent);
        sm.queueSize = Math.max(0, activePackets.length - cfg.maxConcurrent);
        sm.cpuLoad = Math.min(100, Math.round((sm.activeThreads / cfg.maxConcurrent) * 100));

        // Total handled / failed totals from terminal packets
        sm.requestsHandled = terminalPackets.filter((p) => p.status === "success").length;
        sm.requestsFailed = terminalPackets.filter((p) => p.status === "error" || p.status === "timeout").length;

        if (cfg.circuitBreakerEnabled) {
          const totalReq = sm.requestsHandled + sm.requestsFailed;
          if (totalReq >= 10) {
            const failRate = sm.requestsFailed / totalReq;
            const threshold = cfg.circuitBreakerThreshold ?? 0.5;
            if (failRate >= threshold) {
              cfg.circuitBreakerStatus = "OPEN";
            } else if (failRate < threshold * 0.5 && cfg.circuitBreakerStatus === "OPEN") {
              cfg.circuitBreakerStatus = "HALF-OPEN";
            } else if (failRate < 0.1 && cfg.circuitBreakerStatus === "HALF-OPEN") {
              cfg.circuitBreakerStatus = "CLOSED";
            }
          }
        } else {
          cfg.circuitBreakerStatus = "CLOSED";
        }
        break;
      }
      case "cache": {
        const cchm = m as CacheMetrics;
        const cfg = node.data.config as CacheConfig;
        const activePackets = activePacketByNode.get(node.id) || [];
        const terminalPackets = terminalPacketByNode.get(node.id) || [];

        // Robust cache hit rate calculation using paths traversed
        const cachePackets = packets.filter((p) => p.path.includes(node.id));
        let hits = 0;
        let total = 0;
        for (const p of cachePackets) {
          const idx = p.path.indexOf(node.id);
          if (idx === -1) continue;

          if (idx < p.path.length - 1) {
            const nextNodeId = p.path[idx + 1];
            const nextNode = nodes.find((n) => n.id === nextNodeId);
            if (nextNode && ["sqlDb", "noSqlDb"].includes(nextNode.data.nodeType)) {
              // Went to DB next -> Miss
              total++;
            } else {
              // Didn't go to DB next -> Hit
              hits++;
              total++;
            }
          } else {
            // Still currently at cache node, check status
            if (p.status === "hit" || p.status === "success") {
              hits++;
              total++;
            } else if (p.status === "miss") {
              total++;
            }
          }
        }

        cchm.hitRate = total > 0 ? hits / total : cfg.hitRate;
        cchm.currentSizeMB = Math.min(cfg.sizeMB, Math.round((activePackets.length + terminalPackets.length) * 0.1));
        break;
      }
      case "apiGateway": {
        const agm = m as ApiGatewayMetrics;
        const cfg = node.data.config as ApiGatewayConfig;
        const gatewayPackets = packets.filter((p) => p.path.includes(node.id));
        
        let routed = 0;
        let blocked = 0;
        let rateLimited = 0;
        let authFailed = 0;
        
        for (const p of gatewayPackets) {
          const idx = p.path.indexOf(node.id);
          if (idx !== -1) {
            if (idx === p.path.length - 1) {
              // Packet terminated directly at the gateway (e.g. rate limited or auth blocked)
              if (p.status === "timeout") {
                rateLimited++;
                blocked++;
              } else if (p.status === "error") {
                authFailed++;
                blocked++;
              }
            } else {
              // Packet successfully bypassed the gateway
              routed++;
            }
          }
        }
        
        agm.requestsRouted = routed;
        agm.requestsBlocked = blocked;
        agm.rateLimited = rateLimited;
        agm.authFailed = authFailed;

        if (cfg.circuitBreakerEnabled) {
          const totalReq = routed + blocked;
          if (totalReq >= 10) {
            const failRate = blocked / totalReq;
            const threshold = cfg.circuitBreakerThreshold ?? 0.5;
            if (failRate >= threshold) {
              cfg.circuitBreakerStatus = "OPEN";
            } else if (failRate < threshold * 0.5 && cfg.circuitBreakerStatus === "OPEN") {
              cfg.circuitBreakerStatus = "HALF-OPEN";
            } else if (failRate < 0.1 && cfg.circuitBreakerStatus === "HALF-OPEN") {
              cfg.circuitBreakerStatus = "CLOSED";
            }
          }
        } else {
          cfg.circuitBreakerStatus = "CLOSED";
        }
        break;
      }
      case "sqlDb":
      case "noSqlDb": {
        const dm = m as DatabaseMetrics;
        const cfg = node.data.config as DatabaseConfig;
        const activePackets = activePacketByNode.get(node.id) || [];
        dm.connectionsActive = activePackets.length;
        dm.queryLatencyMs = node.data.nodeType === "sqlDb" ? 10 : 5;
        if (activePackets.length > 200) dm.queryLatencyMs += 20;
        dm.replicationLagMs = cfg.replicationMode === "master-slave" ? (cfg.replicationLagMs || 0) : 0;
        dm.diskIO = Math.min(100, Math.round((activePackets.length / Math.max(1, cfg.maxReadThroughput)) * 100));
        break;
      }
      case "messageQueue": {
        const qm = m as MessageQueueMetrics;
        const cfg = node.data.config as MessageQueueConfig;
        const activePackets = activePacketByNode.get(node.id) || [];
        const terminalPackets = terminalPacketByNode.get(node.id) || [];
        qm.queueDepth = activePackets.length;
        qm.processedCount = terminalPackets.filter((p) => p.status === "success").length;
        qm.deadLettered = terminalPackets.filter((p) => p.status === "error" || p.status === "timeout").length;
        break;
      }
    }

    return { ...node, data: { ...node.data, metrics: m } };
  });
}
