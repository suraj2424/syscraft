import type { NodeType } from "@/types/simulation";

export interface FieldSchema {
  key: string
  label: string
  type: "number" | "select" | "toggle"
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
}

export interface NodeTypeSchema {
  nodeType: NodeType
  fields: FieldSchema[]
}

export const nodeSchemas: Record<NodeType, NodeTypeSchema> = {
  client: {
    nodeType: "client",
    fields: [
      { key: "rps", label: "RPS", type: "number", min: 1, max: 100000 },
      { key: "payloadSizeKB", label: "Payload KB", type: "number", min: 1, max: 1024 },
      { key: "readWriteRatio", label: "Read Ratio", type: "number", min: 0, max: 1, step: 0.1 },
    ],
  },
  loadBalancer: {
    nodeType: "loadBalancer",
    fields: [
      { key: "algorithm", label: "Algorithm", type: "select", options: [
        { value: "round-robin", label: "Round Robin" },
        { value: "least-connections", label: "Least Connections" },
        { value: "ip-hash", label: "IP Hash" },
      ]},
    ],
  },
  apiGateway: {
    nodeType: "apiGateway",
    fields: [
      { key: "rateLimitRps", label: "Rate Limit", type: "number", min: 100, max: 100000 },
      { key: "authEnabled", label: "Auth", type: "toggle" },
    ],
  },
  webServer: {
    nodeType: "webServer",
    fields: [
      { key: "maxConcurrent", label: "Max Concurrent", type: "number", min: 1, max: 10000 },
      { key: "processingTimeMs", label: "Process Time ms", type: "number", min: 1, max: 10000 },
      { key: "failureRate", label: "Failure Rate", type: "number", min: 0, max: 1, step: 0.01 },
    ],
  },
  cache: {
    nodeType: "cache",
    fields: [
      { key: "sizeMB", label: "Size MB", type: "number", min: 1, max: 65536 },
      { key: "ttlSec", label: "TTL sec", type: "number", min: 1, max: 86400 },
      { key: "evictionPolicy", label: "Eviction", type: "select", options: [
        { value: "LRU", label: "LRU" },
        { value: "LFU", label: "LFU" },
      ]},
      { key: "hitRate", label: "Hit Rate", type: "number", min: 0, max: 1, step: 0.05 },
    ],
  },
  sqlDb: {
    nodeType: "sqlDb",
    fields: [
      { key: "replicationMode", label: "Replication", type: "select", options: [
        { value: "single", label: "Single" },
        { value: "master-slave", label: "Master-Slave" },
      ]},
      { key: "maxReadThroughput", label: "Read Throughput", type: "number", min: 1, max: 100000 },
      { key: "maxWriteThroughput", label: "Write Throughput", type: "number", min: 1, max: 100000 },
      { key: "replicationLagMs", label: "Repl Lag ms", type: "number", min: 0, max: 10000 },
    ],
  },
  noSqlDb: {
    nodeType: "noSqlDb",
    fields: [
      { key: "replicationMode", label: "Replication", type: "select", options: [
        { value: "single", label: "Single" },
        { value: "master-slave", label: "Master-Slave" },
      ]},
      { key: "maxReadThroughput", label: "Read Throughput", type: "number", min: 1, max: 100000 },
      { key: "maxWriteThroughput", label: "Write Throughput", type: "number", min: 1, max: 100000 },
      { key: "replicationLagMs", label: "Repl Lag ms", type: "number", min: 0, max: 10000 },
    ],
  },
  messageQueue: {
    nodeType: "messageQueue",
    fields: [
      { key: "maxQueueSize", label: "Max Queue", type: "number", min: 100, max: 1000000 },
      { key: "processingRate", label: "Process Rate", type: "number", min: 1, max: 100000 },
    ],
  },
};
