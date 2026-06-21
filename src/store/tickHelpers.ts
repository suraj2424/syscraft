import { type SysCraftNode, type SysCraftEdge, type Packet, type ClientConfig } from "@/types/simulation";
import { processPacket, isTerminalPacket } from "./packetProcessor";

const MAX_PACKETS = 800;
const MAX_PACKET_HISTORY_TICKS = 200;
const MAX_SPAWN_PER_TICK = 32;

export function spawnClientPackets(
  nodes: SysCraftNode[],
  packets: Packet[],
  speed: number,
  tickCount: number,
): { newPackets: Packet[]; spawnedCount: number } {
  const clientNodes = nodes.filter((n) => n.data.nodeType === "client");
  const newPackets: Packet[] = [];
  let spawned = 0;
  for (const client of clientNodes) {
    const remainingBudget = MAX_PACKETS - packets.length - spawned;
    if (remainingBudget <= 0) break;

    const cfg = client.data.config as ClientConfig;
    // Calculate spawn rate per tick precisely (rps * speed / 20)
    const spawnRatePerTick = (cfg.rps * speed) / 20;
    let spawnCount = Math.floor(spawnRatePerTick);
    // Handle fractional spawning using probability
    if (Math.random() < (spawnRatePerTick - spawnCount)) {
      spawnCount += 1;
    }

    spawnCount = Math.min(
      MAX_SPAWN_PER_TICK,
      remainingBudget,
      spawnCount
    );

    for (let i = 0; i < spawnCount; i++) {
      const isRead = Math.random() < cfg.readWriteRatio;
      // Fast, light-weight random ID to replace slow uuidv4
      const pId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      newPackets.push({
        id: pId,
        sourceNodeId: client.id,
        targetNodeId: "",
        requestType: isRead ? "read" : "write",
        status: "created",
        createdAt: tickCount,
        path: [client.id],
        edgeProgress: 0,
        currentEdgeId: null,
        latencyAccMs: 0,
      });
    }
    spawned += spawnCount;
  }
  return { newPackets, spawnedCount: spawned };
}

export function advanceActivePackets(
  activePackets: Packet[],
  nodes: SysCraftNode[],
  edges: SysCraftEdge[],
  speed: number,
  liveCounts: Map<string, number>,
  packets: Packet[],
  apiGatewayTokens: Map<string, number>,
  dbReadTokens: Map<string, number>,
  dbWriteTokens: Map<string, number>,
): Packet[] {
  const advancedPackets: Packet[] = [];
  const edgeLengthCache = new Map<string, number>();

  // Create fast lookup maps to optimize complexity from O(P * N) to O(P + N)
  const nodesMap = new Map<string, SysCraftNode>();
  for (const n of nodes) {
    nodesMap.set(n.id, n);
  }

  const edgesMap = new Map<string, SysCraftEdge>();
  for (const e of edges) {
    edgesMap.set(e.id, e);
  }

  const edgesBySource = new Map<string, SysCraftEdge[]>();
  for (const e of edges) {
    if (!edgesBySource.has(e.source)) {
      edgesBySource.set(e.source, []);
    }
    edgesBySource.get(e.source)!.push(e);
  }

  for (const p of activePackets) {
    if (p.currentEdgeId === null) {
      const nextP = processPacket(
        p,
        nodesMap,
        edgesBySource,
        packets,
        liveCounts,
        apiGatewayTokens,
        dbReadTokens,
        dbWriteTokens
      );
      advancedPackets.push({ ...nextP, edgeProgress: 0 });
      continue;
    }

    let edgeLength = edgeLengthCache.get(p.currentEdgeId);
    if (edgeLength === undefined) {
      const currentEdge = edgesMap.get(p.currentEdgeId);
      const sourceNode = currentEdge ? nodesMap.get(currentEdge.source) : null;
      const targetNode = currentEdge ? nodesMap.get(currentEdge.target) : null;
      edgeLength = sourceNode && targetNode
        ? Math.hypot(targetNode.position.x - sourceNode.position.x, targetNode.position.y - sourceNode.position.y)
        : 100;
      edgeLengthCache.set(p.currentEdgeId, edgeLength);
    }

    const edgeProgressIncrement = (speed * 0.25) / Math.max(1, edgeLength / 100);
    const edgeProgress = p.edgeProgress + edgeProgressIncrement;

    if (edgeProgress >= 1.0) {
      const nextP = processPacket(
        p,
        nodesMap,
        edgesBySource,
        packets,
        liveCounts,
        apiGatewayTokens,
        dbReadTokens,
        dbWriteTokens
      );
      advancedPackets.push({ ...nextP, edgeProgress: 0 });
    } else {
      advancedPackets.push({ ...p, edgeProgress });
    }
  }
  return advancedPackets;
}

export function trimPackets(
  newPackets: Packet[],
  advancedPackets: Packet[],
  terminatedPackets: Packet[],
  tickCount: number,
): Packet[] {
  const terminalToKeep = terminatedPackets.filter((p) => tickCount - p.createdAt < MAX_PACKET_HISTORY_TICKS);
  const totalActiveCount = advancedPackets.length + newPackets.length;
  const terminalToKeepCount = terminalToKeep.length;
  const totalNeeded = totalActiveCount + terminalToKeepCount;

  if (totalNeeded <= MAX_PACKETS) {
    return [...newPackets, ...advancedPackets, ...terminalToKeep];
  }

  const spaceForTerminals = Math.min(terminalToKeepCount, MAX_PACKETS - totalActiveCount);
  const terminalsKept = terminalToKeep.slice(-spaceForTerminals);
  if (totalActiveCount <= MAX_PACKETS) {
    return [...newPackets, ...advancedPackets, ...terminalsKept];
  }

  const maxActive = MAX_PACKETS - terminalsKept.length;
  const activeToKeep = advancedPackets.slice(-maxActive);
  return [...newPackets, ...activeToKeep, ...terminalsKept];
}
