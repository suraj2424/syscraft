import { type Scenario } from "@/types/simulation";
import { defaultMetrics } from "@/model/nodeDefaults";

export const queueAndSpofScenarios: Record<string, Scenario> = {
  "message-queue-flow": {
    id: "message-queue-flow",
    name: "Message Queue Flow",
    description: "Async processing with Message Queue",
    goal: "Test the Message Queue flow: Client → API Gateway → Message Queue → Web Server → Database",
    hints: [
      "This scenario pre-configures a full MQ pipeline",
      "Watch packets flow through the queue",
      " adjust the Message Queue processingRate to see backlog effects",
    ],
    nodes: [
      {
        id: "mq-client",
        type: "client",
        position: { x: 100, y: 200 },
        data: {
          nodeType: "client",
          label: "Client",
          config: { rps: 100, payloadSizeKB: 4, readWriteRatio: 0.5 },
          metrics: defaultMetrics("client"),
        },
      },
      {
        id: "mq-apigw",
        type: "apiGateway",
        position: { x: 350, y: 200 },
        data: {
          nodeType: "apiGateway",
          label: "API Gateway",
          config: { rateLimitRps: 1000, authEnabled: false },
          metrics: defaultMetrics("apiGateway"),
        },
      },
      {
        id: "mq-mq",
        type: "messageQueue",
        position: { x: 600, y: 200 },
        data: {
          nodeType: "messageQueue",
          label: "Message Queue",
          config: { maxQueueSize: 10000, processingRate: 200 },
          metrics: defaultMetrics("messageQueue"),
        },
      },
      {
        id: "mq-server",
        type: "webServer",
        position: { x: 850, y: 200 },
        data: {
          nodeType: "webServer",
          label: "Web Server",
          config: { maxConcurrent: 50, processingTimeMs: 30, failureRate: 0.01, currentQueue: 0 },
          metrics: defaultMetrics("webServer"),
        },
      },
      {
        id: "mq-db",
        type: "sqlDb",
        position: { x: 1100, y: 200 },
        data: {
          nodeType: "sqlDb",
          label: "SQL DB",
          config: { type: "sql", replicationMode: "single", maxReadThroughput: 500, maxWriteThroughput: 200, replicationLagMs: 0 },
          metrics: defaultMetrics("sqlDb"),
        },
      },
    ],
    edges: [
      { id: "mqe1", source: "mq-client", target: "mq-apigw", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "mqe2", source: "mq-apigw", target: "mq-mq", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "mqe3", source: "mq-mq", target: "mq-server", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
      { id: "mqe4", source: "mq-server", target: "mq-db", type: "packetEdge", sourceHandle: "bottom-source", targetHandle: "top-target" },
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
