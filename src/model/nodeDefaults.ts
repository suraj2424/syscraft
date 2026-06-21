import type { NodeType, SysCraftNode, SysCraftEdge, Scenario } from "@/types/simulation"

export const nodeLabels: Record<NodeType, string> = {
  client: "Client",
  loadBalancer: "LB",
  apiGateway: "API Gateway",
  webServer: "Web Server",
  cache: "Cache",
  sqlDb: "SQL DB",
  noSqlDb: "NoSQL DB",
  messageQueue: "Message Queue",
  eventBus: "Event Bus",
}

export function defaultConfig(nodeType: NodeType): any {
  switch (nodeType) {
    case "client": return { rps: 100, payloadSizeKB: 4, readWriteRatio: 0.8, maxRetries: 3, retryBackoffMs: 100 }
    case "loadBalancer": return { algorithm: "round-robin", rrIndex: 0 }
    case "apiGateway": return { rateLimitRps: 1000, authEnabled: true, circuitBreakerEnabled: false, circuitBreakerThreshold: 0.5, circuitBreakerStatus: "CLOSED" }
    case "webServer": return { maxConcurrent: 50, processingTimeMs: 50, failureRate: 0.01, currentQueue: 0, circuitBreakerEnabled: false, circuitBreakerThreshold: 0.5, circuitBreakerStatus: "CLOSED" }
    case "cache": return { sizeMB: 512, ttlSec: 300, evictionPolicy: "LRU", hitRate: 0.8 }
    case "sqlDb": return { type: "sql", replicationMode: "single", maxReadThroughput: 500, maxWriteThroughput: 200, replicationLagMs: 0 }
    case "noSqlDb": return { type: "nosql", replicationMode: "single", maxReadThroughput: 2000, maxWriteThroughput: 1000, replicationLagMs: 0 }
    case "messageQueue": return { maxQueueSize: 10000, processingRate: 500 }
    case "eventBus": return { fanout: true }
  }
}

export function defaultMetrics(nodeType: NodeType): any {
  switch (nodeType) {
    case "client": return { totalSent: 0, failedRequests: 0, avgLatencyMs: 0 }
    case "loadBalancer": return { connectionDistribution: {}, activeConnections: 0 }
    case "apiGateway": return { requestsRouted: 0, requestsBlocked: 0, rateLimited: 0, authFailed: 0 }
    case "webServer": return { cpuLoad: 0, queueSize: 0, activeThreads: 0, requestsHandled: 0, requestsFailed: 0 }
    case "cache": return { hitRate: 0.8, currentSizeMB: 0, evictions: 0, avgLatencyMs: 1 }
    case "sqlDb": return { diskIO: 0, queryLatencyMs: 10, replicationLagMs: 0, connectionsActive: 0 }
    case "noSqlDb": return { diskIO: 0, queryLatencyMs: 5, replicationLagMs: 0, connectionsActive: 0 }
    case "messageQueue": return { queueDepth: 0, processedCount: 0, deadLettered: 0 }
    case "eventBus": return { messagesPublished: 0 }
  }
}

export const colorMap: Record<NodeType, string> = {
  client: "#ffc285",
  loadBalancer: "#c4b5fd",
  apiGateway: "#a0c3ec",
  webServer: "#ffffff",
  cache: "#ff7a17",
  sqlDb: "#8b5cf6",
  noSqlDb: "#f97316",
  messageQueue: "#ec4899",
  eventBus: "#ff7a17",
}

export const NODE_DEFINITIONS = [
  { id: "client" as NodeType, label: "Client", color: "#ffc285" },
  { id: "loadBalancer" as NodeType, label: "Load Balancer", color: "#c4b5fd" },
  { id: "apiGateway" as NodeType, label: "API Gateway", color: "#a0c3ec" },
  { id: "webServer" as NodeType, label: "Web Server", color: "#ffffff" },
  { id: "cache" as NodeType, label: "Cache", color: "#ff7a17" },
  { id: "sqlDb" as NodeType, label: "SQL Database", color: "#8b5cf6" },
  { id: "noSqlDb" as NodeType, label: "NoSQL Database", color: "#f97316" },
  { id: "messageQueue" as NodeType, label: "Message Queue", color: "#ec4899" },
  { id: "eventBus" as NodeType, label: "Event Bus", color: "#ff7a17" },
]

export function makeBaseNode(id: string, type: NodeType, x: number, y: number): SysCraftNode {
  return {
    id, type, position: { x, y },
    data: {
      nodeType: type, label: nodeLabels[type],
      config: defaultConfig(type) as any,
      metrics: defaultMetrics(type) as any,
    },
  } as SysCraftNode
}

export const SCENARIOS: Record<string, Scenario> = {
  "horizontal-scaling": {
    id: "horizontal-scaling", name: "Horizontal Scaling",
    description: "1 Server crashin",
    goal: "Drop a Load Balancer, spin up 3 Web Servers, and distribute the load to handle 10,000 RPS.",
    hints: ["Add a Load Balancer between the Client and Servers", "Create 2-3 Web Servers", "Connect the LB to all Servers", "Set LB algorithm to round-robin"],
    nodes: [makeBaseNode("scenario-client", "client", 100, 300), makeBaseNode("scenario-server", "webServer", 500, 300)],
    edges: [{ id: "scenario-edge-1", source: "scenario-client", target: "scenario-server", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge],
  },
  "database-caching": {
    id: "database-caching", name: "Database Caching",
    description: "DB has massive read latency",
    goal: "Intercept reads by placing a Cache node before the DB and configuring a proper TTL.",
    hints: ["Drag a Cache node between the Server and DB", "Set Cache TTL to 300s", "Connect Server → Cache → DB"],
    nodes: [
      makeBaseNode("sc-client", "client", 100, 300),
      makeBaseNode("sc-server", "webServer", 400, 300),
      makeBaseNode("sc-db", "sqlDb", 750, 300),
    ],
    edges: [
      { id: "sce1", source: "sc-client", target: "sc-server", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "sce2", source: "sc-server", target: "sc-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
    ],
  },
  "message-queue-flow": {
    id: "message-queue-flow", name: "Message Queue Flow",
    description: "Async processing with Message Queue",
    goal: "Test the Message Queue flow: Client → API Gateway → Message Queue → Web Server → Database",
    hints: ["This scenario pre-configures a full MQ pipeline", "Watch packets flow through the queue", "adjust the Message Queue processingRate to see backlog effects"],
    nodes: [
      makeBaseNode("mq-client", "client", 100, 200),
      makeBaseNode("mq-apigw", "apiGateway", 350, 200),
      makeBaseNode("mq-mq", "messageQueue", 600, 200),
      makeBaseNode("mq-server", "webServer", 850, 200),
      makeBaseNode("mq-db", "sqlDb", 1100, 200),
    ],
    edges: [
      { id: "mqe1", source: "mq-client", target: "mq-apigw", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "mqe2", source: "mq-apigw", target: "mq-mq", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "mqe3", source: "mq-mq", target: "mq-server", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "mqe4", source: "mq-server", target: "mq-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
    ],
  },
  "single-point-of-failure": {
    id: "single-point-of-failure", name: "Single Point of Failure",
    description: "Design a system that survives a DB node crash",
    goal: "Set up Master-Slave replication on the DB so the system survives a primary node crash.",
    hints: ["Create a second SQL DB node", "Set one DB to Master-Slave replication mode", "Connect the second DB as a slave"],
    nodes: [
      makeBaseNode("spof-client", "client", 100, 100),
      makeBaseNode("spof-lb", "loadBalancer", 350, 100),
      makeBaseNode("spof-server1", "webServer", 600, 50),
      makeBaseNode("spof-server2", "webServer", 600, 200),
      makeBaseNode("spof-db", "sqlDb", 850, 130),
    ],
    edges: [
      { id: "se1", source: "spof-client", target: "spof-lb", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "se2", source: "spof-lb", target: "spof-server1", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "se3", source: "spof-lb", target: "spof-server2", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "se4", source: "spof-server1", target: "spof-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
      { id: "se5", source: "spof-server2", target: "spof-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target", data: {} } as any as SysCraftEdge,
    ],
  },
}

export function resetNodeMetrics(nodes: SysCraftNode[]): SysCraftNode[] {
  return nodes.map((n) => ({ ...n, data: { ...n.data, metrics: defaultMetrics(n.data.nodeType) as any } }))
}
