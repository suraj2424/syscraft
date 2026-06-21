/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type SysCraftNode,
  type SysCraftEdge,
  type Packet,
} from "@/types/simulation";
import {
  handleClientOrLB,
  handleWebServer,
  handleCache,
  handleDatabase,
  handleApiGateway,
  handleMessageQueue,
  handleEventBus,
} from "./packetRouting";

const TERMINAL_PACKET_STATUSES = new Set<Packet["status"]>(["success", "error", "timeout"]);

export function isTerminalPacket(p: Packet): boolean {
  return TERMINAL_PACKET_STATUSES.has(p.status);
}

export function resetSimulationState(logs: string[]) {
  return {
    isRunning: false,
    speed: 1 as 1 | 2 | 5,
    tickCount: 0,
    globalTime: 0,
    logs,
  };
}

const lbIndices = new Map<string, number>();

export function resetProcessorState() {
  lbIndices.clear();
}

export function pickDownstream(
  node: SysCraftNode,
  edgesBySource: Map<string, SysCraftEdge[]>,
  nodesMap: Map<string, SysCraftNode>,
  sourceHandleHint?: string,
  packet?: Packet,
): SysCraftNode | null {
  const nodeType = node.data.nodeType;
  const outEdges = (edgesBySource.get(node.id) || []).filter((e) => {
    if (sourceHandleHint && e.sourceHandle && e.sourceHandle !== sourceHandleHint) return false;
    return true;
  });
  if (outEdges.length === 0) return null;
  const targets = outEdges
    .map((e) => nodesMap.get(e.target))
    .filter((n): n is SysCraftNode => n !== undefined);

  if (nodeType === "loadBalancer") {
    const cfg = node.data.config as any;
    const connectedNodes = targets;
    if (connectedNodes.length === 0) return null;

    switch (cfg.algorithm) {
      case "round-robin": {
        const idx = lbIndices.get(node.id) ?? 0;
        lbIndices.set(node.id, idx + 1);
        return connectedNodes[idx % connectedNodes.length];
      }
      case "least-connections": {
        let minNode = connectedNodes[0];
        let minLoad = (() => {
          const m = minNode.data.metrics as any;
          return m.activeThreads || m.activeConnections || m.queueDepth || 0;
        })();
        for (let i = 1; i < connectedNodes.length; i++) {
          const load = (() => {
            const m = connectedNodes[i].data.metrics as any;
            return m.activeThreads || m.activeConnections || m.queueDepth || 0;
          })();
          if (load < minLoad) {
            minLoad = load;
            minNode = connectedNodes[i];
          }
        }
        return minNode;
      }
      case "ip-hash": {
        const clientKey = packet ? packet.sourceNodeId : "";
        const hash = clientKey.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return connectedNodes[hash % connectedNodes.length];
      }
      default:
        return connectedNodes[0];
    }
  }

  return targets[0] ?? null;
}

export function processPacket(
  packet: Packet,
  nodesMap: Map<string, SysCraftNode>,
  edgesBySource: Map<string, SysCraftEdge[]>,
  packets: Packet[],
  liveCounts: Map<string, number>,
  apiGatewayTokens: Map<string, number>,
  dbReadTokens: Map<string, number>,
  dbWriteTokens: Map<string, number>,
  spawnedPackets?: Packet[],
): Packet {
  const currentId = packet.path[packet.path.length - 1];
  const currentNode = nodesMap.get(currentId);
  if (!currentNode) return { ...packet, status: "error" };

  const outSourceHint = "bottom-source";
  const nodeType = currentNode.data.nodeType;

  // Track state transitions dynamically
  // Decrement current node's active count since we are leaving it
  const currentCount = liveCounts.get(currentId) ?? 0;
  if (currentCount > 0) {
    liveCounts.set(currentId, currentCount - 1);
  }

  let nextP: Packet;

  switch (nodeType) {
    case "client":
    case "loadBalancer":
      nextP = handleClientOrLB(packet, currentNode, edgesBySource, nodesMap, outSourceHint);
      break;
    case "webServer":
      nextP = handleWebServer(packet, currentNode, edgesBySource, nodesMap, liveCounts, outSourceHint);
      break;
    case "cache":
      nextP = handleCache(packet, currentNode, edgesBySource, nodesMap);
      break;
    case "sqlDb":
    case "noSqlDb":
      nextP = handleDatabase(packet, currentNode, dbReadTokens, dbWriteTokens);
      break;
    case "apiGateway":
      nextP = handleApiGateway(packet, currentNode, edgesBySource, nodesMap, apiGatewayTokens, outSourceHint);
      break;
    case "messageQueue":
      nextP = handleMessageQueue(packet, currentNode, edgesBySource, nodesMap, liveCounts);
      break;
    case "eventBus":
      nextP = handleEventBus(packet, currentNode, edgesBySource, nodesMap, liveCounts, spawnedPackets);
      break;
    default:
      nextP = { ...packet, status: "error", latencyAccMs: packet.latencyAccMs + 5 };
  }

  // If nextP is not terminal, increment the active count at the next node
  if (nextP.status !== "success" && nextP.status !== "error" && nextP.status !== "timeout") {
    const nextId = nextP.path[nextP.path.length - 1];
    liveCounts.set(nextId, (liveCounts.get(nextId) ?? 0) + 1);
  }

  return nextP;
}
