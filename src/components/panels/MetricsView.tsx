/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { MetricBar } from "./ConfigFields";

interface MetricsViewProps {
  nodeType: string;
  metrics: any;
  config: any;
}

export function MetricsView({ nodeType, metrics, config }: MetricsViewProps) {
  const m = metrics as any;
  switch (nodeType) {
    case "client":
      return (
        <>
          <MetricBar label="Total Sent" value={m.totalSent} max={10000} color="#fbbf24" />
          <MetricBar label="Failed" value={m.failedRequests} max={m.totalSent || 1} color="#ef4444" />
          <MetricBar label="Avg Latency" value={m.avgLatencyMs} max={500} unit="ms" color="#6366f1" />
        </>
      );
    case "loadBalancer":
      return (
        <MetricBar label="Active Connections" value={m.activeConnections} max={1000} color="#6366f1" />
      );
    case "apiGateway":
      return (
        <>
          <MetricBar label="Routed" value={m.requestsRouted} max={10000} color="#8b5cf6" />
          <MetricBar label="Blocked" value={m.requestsBlocked} max={1000} color="#ef4444" />
          <MetricBar label="Rate Limited" value={m.rateLimited || 0} max={1000} color="#f59e0b" />
          <MetricBar label="Auth Failed" value={m.authFailed || 0} max={1000} color="#3b82f6" />
        </>
      );
    case "webServer":
      return (
        <>
          <MetricBar label="CPU Load" value={m.cpuLoad} max={100} unit="%" color="#3b82f6" />
          <MetricBar label="Queue" value={m.queueSize} max={config.maxConcurrent * 2} color="#f59e0b" />
          <MetricBar label="Active Threads" value={m.activeThreads} max={config.maxConcurrent} color="#10b981" />
        </>
      );
    case "cache":
      return (
        <>
          <MetricBar label="Hit Rate" value={Math.round(m.hitRate * 100)} max={100} unit="%" color="#10b981" />
          <MetricBar label="Size" value={m.currentSizeMB} max={config.sizeMB} unit="MB" color="#f59e0b" />
        </>
      );
    case "sqlDb":
    case "noSqlDb":
      return (
        <>
          <MetricBar label="Connections" value={m.connectionsActive} max={config.maxReadThroughput} color="#10b981" />
          <MetricBar label="Query Latency" value={m.queryLatencyMs} max={100} unit="ms" color="#6366f1" />
          {config.replicationMode === "master-slave" && (
            <MetricBar label="Replication Lag" value={m.replicationLagMs} max={1000} unit="ms" color="#f59e0b" />
          )}
        </>
      );
    case "messageQueue":
      return (
        <>
          <MetricBar label="Queue Depth" value={m.queueDepth} max={config.maxQueueSize} color="#ec4899" />
          <MetricBar label="Processed" value={m.processedCount} max={10000} color="#10b981" />
          <MetricBar label="Dead Letter" value={m.deadLettered} max={config.maxQueueSize} color="#ef4444" />
        </>
      );
    case "eventBus":
      return (
        <MetricBar label="Published" value={m.messagesPublished} max={10000} color="#ff7a17" />
      );
    default:
      return null;
  }
}
