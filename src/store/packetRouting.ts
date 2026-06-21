import {
  type SysCraftNode,
  type SysCraftEdge,
  type Packet,
  type ServerConfig,
  type CacheConfig,
  type DatabaseConfig,
  type ApiGatewayConfig,
  type MessageQueueConfig,
} from "@/types/simulation";
import { pickDownstream } from "./packetProcessor";

const mqIndices = new Map<string, number>();

export function resetRoutingState() {
  mqIndices.clear();
}


export function handleClientOrLB(
  packet: Packet,
  currentNode: SysCraftNode,
  edgesBySource: Map<string, SysCraftEdge[]>,
  nodesMap: Map<string, SysCraftNode>,
  outSourceHint: string,
): Packet {
  const next = pickDownstream(currentNode, edgesBySource, nodesMap, outSourceHint, packet);
  if (!next) return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
  const outEdges = edgesBySource.get(currentNode.id) || [];
  const nextEdge = outEdges.find(
    (e) => e.target === next.id && (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint)
  );
  return {
    ...packet,
    path: [...packet.path, next.id],
    currentEdgeId: nextEdge?.id ?? `${currentNode.id}-${next.id}`,
    edgeProgress: 0,
    status: "in-flight",
  };
}

export function handleWebServer(
  packet: Packet,
  currentNode: SysCraftNode,
  edgesBySource: Map<string, SysCraftEdge[]>,
  nodesMap: Map<string, SysCraftNode>,
  liveCounts: Map<string, number>,
  outSourceHint: string,
): Packet {
  const cfg = currentNode.data.config as ServerConfig;
  const currentCount = liveCounts.get(currentNode.id) ?? 0;
  // Concurrency limit check: reject if active threads count strictly exceeds limit
  const queueFull = currentCount > cfg.maxConcurrent;
  if (queueFull || Math.random() < cfg.failureRate) {
    return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + cfg.processingTimeMs };
  }

  if (packet.requestType === "read") {
    const outEdges = edgesBySource.get(currentNode.id) || [];
    const cacheEdge = outEdges.find(
      (e) => (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint) &&
        nodesMap.get(e.target)?.data.nodeType === "cache"
    );
    const cacheNode = cacheEdge ? nodesMap.get(cacheEdge.target) : null;
    if (cacheNode) {
      const cacheCfg = cacheNode.data.config as CacheConfig;
      const isHit = Math.random() < cacheCfg.hitRate;
      return {
        ...packet,
        path: [...packet.path, cacheNode.id],
        currentEdgeId: cacheEdge!.id,
        edgeProgress: 0,
        status: isHit ? "hit" : "miss",
        latencyAccMs: packet.latencyAccMs + (isHit ? 1 : 5),
      };
    }
  }

  const outEdges = edgesBySource.get(currentNode.id) || [];
  const dbEdge = outEdges.find(
    (e) => (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint) &&
      ["sqlDb", "noSqlDb"].includes(nodesMap.get(e.target)?.data.nodeType || "")
  );
  if (dbEdge) {
    return {
      ...packet,
      path: [...packet.path, dbEdge.target],
      currentEdgeId: dbEdge.id,
      edgeProgress: 0,
      latencyAccMs: packet.latencyAccMs + cfg.processingTimeMs,
    };
  }

  return { ...packet, status: "success", latencyAccMs: packet.latencyAccMs + cfg.processingTimeMs };
}

export function handleCache(
  packet: Packet,
  currentNode: SysCraftNode,
  edgesBySource: Map<string, SysCraftEdge[]>,
  nodesMap: Map<string, SysCraftNode>,
): Packet {
  const serverNodeId = packet.path[packet.path.length - 2];
  const outEdges = serverNodeId ? edgesBySource.get(serverNodeId) || [] : [];
  const backEdgeId = serverNodeId ? outEdges.find((e) => e.target === currentNode.id)?.id : null;

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
  if (packet.status === "miss") {
    const cacheOutEdges = edgesBySource.get(currentNode.id) || [];
    const dbEdge = cacheOutEdges.find((e) =>
      ["sqlDb", "noSqlDb"].includes(nodesMap.get(e.target)?.data.nodeType || "")
    );
    if (dbEdge) {
      return {
        ...packet,
        path: [...packet.path, dbEdge.target],
        currentEdgeId: dbEdge.id,
        edgeProgress: 0,
        latencyAccMs: packet.latencyAccMs + 1,
      };
    }
  }
  return { ...packet, status: "success", latencyAccMs: packet.latencyAccMs + 1 };
}

export function handleDatabase(
  packet: Packet,
  currentNode: SysCraftNode,
  dbReadTokens: Map<string, number>,
  dbWriteTokens: Map<string, number>,
): Packet {
  const cfg = currentNode.data.config as DatabaseConfig;
  const dbLatency = currentNode.data.nodeType === "sqlDb" ? 10 : 5;

  const tokenMap = packet.requestType === "read" ? dbReadTokens : dbWriteTokens;
  const tokens = tokenMap.get(currentNode.id) ?? 0;

  if (tokens >= 1.0) {
    tokenMap.set(currentNode.id, tokens - 1.0);
    const lag = cfg.replicationMode === "master-slave" ? (cfg.replicationLagMs || 0) : 0;
    return { ...packet, status: "success", latencyAccMs: packet.latencyAccMs + dbLatency + lag };
  } else {
    return { ...packet, status: "timeout", latencyAccMs: packet.latencyAccMs + dbLatency + 100 };
  }
}

export function handleApiGateway(
  packet: Packet,
  currentNode: SysCraftNode,
  edgesBySource: Map<string, SysCraftEdge[]>,
  nodesMap: Map<string, SysCraftNode>,
  apiGatewayTokens: Map<string, number>,
  outSourceHint: string,
): Packet {
  const cfg = currentNode.data.config as ApiGatewayConfig;
  const tokens = apiGatewayTokens.get(currentNode.id) ?? 0;
  if (tokens < 1.0) {
    return { ...packet, status: "timeout", latencyAccMs: packet.latencyAccMs + 5 };
  }

  // If Auth is enabled, 5% of requests fail authentication and get blocked
  if (cfg.authEnabled && Math.random() < 0.05) {
    return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
  }

  const next = pickDownstream(currentNode, edgesBySource, nodesMap, outSourceHint, packet);
  if (!next) return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };

  apiGatewayTokens.set(currentNode.id, tokens - 1.0);

  const outEdges = edgesBySource.get(currentNode.id) || [];
  const nextEdge = outEdges.find(
    (e) => e.target === next.id && (!outSourceHint || !e.sourceHandle || e.sourceHandle === outSourceHint)
  );

  return {
    ...packet,
    path: [...packet.path, next.id],
    currentEdgeId: nextEdge?.id ?? `${currentNode.id}-${next.id}`,
    edgeProgress: 0,
    latencyAccMs: packet.latencyAccMs + 2,
    status: "in-flight",
  };
}

export function handleMessageQueue(
  packet: Packet,
  currentNode: SysCraftNode,
  edgesBySource: Map<string, SysCraftEdge[]>,
  nodesMap: Map<string, SysCraftNode>,
  liveCounts: Map<string, number>,
): Packet {
  const cfg = currentNode.data.config as MessageQueueConfig;
  const currentCount = liveCounts.get(currentNode.id) ?? 0;

  if (currentCount > cfg.maxQueueSize) {
    return { ...packet, status: "timeout", latencyAccMs: packet.latencyAccMs + 5 };
  }

  const allOutEdges = edgesBySource.get(currentNode.id) || [];
  const targets = allOutEdges
    .map((e) => nodesMap.get(e.target))
    .filter(Boolean) as SysCraftNode[];

  if (targets.length === 0) {
    return { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
  }

  // Competing consumers pattern: distribute to target with the lowest active load.
  // If there's a tie, round-robin among them to distribute load evenly.
  let minCount = Infinity;
  let candidates: SysCraftNode[] = [];
  for (const t of targets) {
    const count = liveCounts.get(t.id) ?? 0;
    if (count < minCount) {
      minCount = count;
      candidates = [t];
    } else if (count === minCount) {
      candidates.push(t);
    }
  }

  const idx = mqIndices.get(currentNode.id) ?? 0;
  const next = candidates[idx % candidates.length];
  mqIndices.set(currentNode.id, (idx + 1) % candidates.length);

  const nextEdge = allOutEdges.find((e) => e.target === next.id);
  const nextCount = liveCounts.get(next.id) ?? 0;

  if (next.data.nodeType === "webServer" && nextCount > (next.data.config as ServerConfig).maxConcurrent) {
    return { ...packet, status: "timeout", latencyAccMs: packet.latencyAccMs + 1000 / cfg.processingRate };
  }

  return {
    ...packet,
    path: [...packet.path, next.id],
    currentEdgeId: nextEdge?.id ?? `${currentNode.id}-${next.id}`,
    edgeProgress: 0,
    latencyAccMs: packet.latencyAccMs + 1000 / cfg.processingRate,
    status: "in-flight",
  };
}
