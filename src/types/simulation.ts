import type { Node, Edge } from "@xyflow/react";

// ── Node Types ────────────────────────────────────────────────────────
export type NodeType =
  | "client"
  | "loadBalancer"
  | "apiGateway"
  | "webServer"
  | "cache"
  | "sqlDb"
  | "noSqlDb"
  | "messageQueue";

// ── LB Strategy ───────────────────────────────────────────────────────
export type LBStrategy = "round-robin" | "least-connections" | "ip-hash";

// ── Cache Eviction ────────────────────────────────────────────────────
export type CacheEviction = "LRU" | "LFU";

// ── DB Replication Mode ───────────────────────────────────────────────
export type ReplicationMode = "single" | "master-slave";

// ── Request Type ──────────────────────────────────────────────────────
export type RequestType = "read" | "write";

// ── Packet State ──────────────────────────────────────────────────────
export type PacketStatus =
  | "created"
  | "in-flight"
  | "hit"
  | "miss"
  | "success"
  | "error"
  | "timeout";

// ── Per-node configuration ────────────────────────────────────────────
export interface ClientConfig {
  rps: number;
  payloadSizeKB: number;
  readWriteRatio: number; // 0-1, fraction of reads
}

export interface LoadBalancerConfig {
  algorithm: LBStrategy;
  rrIndex: number; // internal round-robin position
}

export interface ServerConfig {
  maxConcurrent: number;
  processingTimeMs: number;
  failureRate: number; // 0-1
  currentQueue: number;
}

export interface CacheConfig {
  sizeMB: number;
  ttlSec: number;
  evictionPolicy: CacheEviction;
  hitRate: number; // 0-1
}

export interface DatabaseConfig {
  type: "sql" | "nosql";
  replicationMode: ReplicationMode;
  maxReadThroughput: number;
  maxWriteThroughput: number;
  replicationLagMs: number;
}

export interface ApiGatewayConfig {
  rateLimitRps: number;
  authEnabled: boolean;
}

export interface MessageQueueConfig {
  maxQueueSize: number;
  processingRate: number;
}

export type NodeConfig =
  | { nodeType: "client"; config: ClientConfig }
  | { nodeType: "loadBalancer"; config: LoadBalancerConfig }
  | { nodeType: "apiGateway"; config: ApiGatewayConfig }
  | { nodeType: "webServer"; config: ServerConfig }
  | { nodeType: "cache"; config: CacheConfig }
  | { nodeType: "sqlDb"; config: DatabaseConfig }
  | { nodeType: "noSqlDb"; config: DatabaseConfig }
  | { nodeType: "messageQueue"; config: MessageQueueConfig };

// ── Per-node runtime metrics ──────────────────────────────────────────
export interface ClientMetrics {
  totalSent: number;
  failedRequests: number;
  avgLatencyMs: number;
}

export interface LoadBalancerMetrics {
  connectionDistribution: Record<string, number>;
  activeConnections: number;
}

export interface ServerMetrics {
  cpuLoad: number; // 0-100
  queueSize: number;
  activeThreads: number;
  requestsHandled: number;
  requestsFailed: number;
}

export interface CacheMetrics {
  hitRate: number; // 0-1
  currentSizeMB: number;
  evictions: number;
  avgLatencyMs: number;
}

export interface DatabaseMetrics {
  diskIO: number;
  queryLatencyMs: number;
  replicationLagMs: number;
  connectionsActive: number;
}

export interface ApiGatewayMetrics {
  requestsRouted: number;
  requestsBlocked: number;
}

export interface MessageQueueMetrics {
  queueDepth: number;
  processedCount: number;
  deadLettered: number;
}

export type NodeMetrics =
  | { nodeType: "client"; metrics: ClientMetrics }
  | { nodeType: "loadBalancer"; metrics: LoadBalancerMetrics }
  | { nodeType: "apiGateway"; metrics: ApiGatewayMetrics }
  | { nodeType: "webServer"; metrics: ServerMetrics }
  | { nodeType: "cache"; metrics: CacheMetrics }
  | { nodeType: "sqlDb"; metrics: DatabaseMetrics }
  | { nodeType: "noSqlDb"; metrics: DatabaseMetrics }
  | { nodeType: "messageQueue"; metrics: MessageQueueMetrics };

// ── Data attached to every React Flow node ────────────────────────────
export interface SysCraftNodeData extends Record<string, unknown> {
  nodeType: NodeType;
  label: string;
  config: NodeConfig["config"];
  metrics: NodeMetrics["metrics"];
}

export type SysCraftNode = Node<SysCraftNodeData, NodeType>;
export type SysCraftEdge = Edge & {
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

// ── Packets (the animated dots traveling along edges) ─────────────────
export interface Packet {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  requestType: RequestType;
  status: PacketStatus;
  createdAt: number;
  path: string[]; // ordered list of node ids traversed so far
  edgeProgress: number; // 0-1 for edge animation position
  currentEdgeId: string | null;
  latencyAccMs: number;
}

// ── Simulation tick state ─────────────────────────────────────────────
export interface SimState {
  isRunning: boolean;
  speed: 1 | 2 | 5;
  tickCount: number;
  globalTime: number; // ms elapsed in sim-time
  logs: string[];
}

// ── Scenario definitions ──────────────────────────────────────────────
export interface Scenario {
  id: string;
  name: string;
  description: string;
  nodes: SysCraftNode[];
  edges: SysCraftEdge[];
  goal: string;
  hints: string[];
}