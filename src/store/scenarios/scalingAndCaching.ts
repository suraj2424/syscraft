import { type Scenario } from "@/types/simulation";
import { defaultMetrics } from "@/model/nodeDefaults";

export const scalingAndCachingScenarios: Record<string, Scenario> = {
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
};
