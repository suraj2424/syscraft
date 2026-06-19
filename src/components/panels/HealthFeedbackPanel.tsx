"use client";

import React, { useMemo, useState } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Database, Server, Activity, Download, Bug, ChevronDown, ChevronUp } from "lucide-react";

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  recommendation: string;
  affectedNodes?: string[];
}

export function HealthFeedbackPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const nodes = useSimulationStore((s) => s.nodes);
  const edges = useSimulationStore((s) => s.edges);
  const packets = useSimulationStore((s) => s.packets);
  const isRunning = useSimulationStore((s) => s.simulation.isRunning);
  const tickCount = useSimulationStore((s) => s.simulation.tickCount);

  const healthIssues = useMemo(() => {
    const issues: HealthIssue[] = [];

    if (nodes.length === 0) {
      issues.push({
        severity: "critical",
        category: "Configuration",
        message: "No system components deployed",
        recommendation: "Add at least a Client and backend service to start simulation",
      });
      return issues;
    }

    if (!isRunning) {
      issues.push({
        severity: "info",
        category: "State",
        message: "Simulation is paused",
        recommendation: "Click Play to start traffic flow and observe system behavior",
      });
    }

    const clientNodes = nodes.filter((n) => n.data.nodeType === "client");
    const serverNodes = nodes.filter((n) => n.data.nodeType === "webServer");
    const lbNodes = nodes.filter((n) => n.data.nodeType === "loadBalancer");
    const dbNodes = nodes.filter((n) => n.data.nodeType === "sqlDb" || n.data.nodeType === "noSqlDb");
    const cacheNodes = nodes.filter((n) => n.data.nodeType === "cache");
    const apiGateways = nodes.filter((n) => n.data.nodeType === "apiGateway");
    const messageQueueNodes = nodes.filter((n) => n.data.nodeType === "messageQueue");

    if (clientNodes.length > 0 && serverNodes.length === 0 && dbNodes.length === 0) {
      issues.push({
        severity: "critical",
        category: "Architecture",
        message: "Clients deployed without backend services",
        recommendation: "Add Web Servers, Databases, or Caches to handle client requests",
        affectedNodes: clientNodes.map((n) => n.id),
      });
    }

    if (serverNodes.length === 1 && lbNodes.length === 0) {
      issues.push({
        severity: "warning",
        category: "Reliability",
        message: "Single server is a single point of failure",
        recommendation: "Add a Load Balancer and multiple servers for high availability",
        affectedNodes: serverNodes.map((n) => n.id),
      });
    }

    for (const server of serverNodes) {
      const cfg = server.data.config as any;
      const metrics = server.data.metrics as any;

      if (cfg.failureRate > 0.1) {
        issues.push({
          severity: "critical",
          category: "Server Health",
          message: `Server ${server.data.label} has high failure rate (${(cfg.failureRate * 100).toFixed(0)}%)`,
          recommendation: "Reduce failure rate or add redundancy",
          affectedNodes: [server.id],
        });
      }

      if (metrics.cpuLoad > 80) {
        issues.push({
          severity: "warning",
          category: "Server Health",
          message: `Server ${server.data.label} is under heavy load (${metrics.cpuLoad}% CPU)`,
          recommendation: "Scale horizontally by adding more servers or increase maxConcurrent",
          affectedNodes: [server.id],
        });
      }

      if (metrics.queueSize > cfg.maxConcurrent * 0.5) {
        issues.push({
          severity: "critical",
          category: "Capacity",
          message: `Server ${server.data.label} queue is backing up (${metrics.queueSize} pending)`,
          recommendation: "Immediately add more servers or reduce client RPS",
          affectedNodes: [server.id],
        });
      }
    }

    for (const db of dbNodes) {
      const cfg = db.data.config as any;
      if (cfg.replicationMode === "single") {
        issues.push({
          severity: "warning",
          category: "Database",
          message: `Database ${db.data.label} has no replication`,
          recommendation: "Enable master-slave replication for fault tolerance",
          affectedNodes: [db.id],
        });
      }
    }

    if (serverNodes.length > 0 && dbNodes.length > 0 && cacheNodes.length === 0) {
      issues.push({
        severity: "info",
        category: "Performance",
        message: "No cache layer detected",
        recommendation: "Add a Cache node to reduce database load for read-heavy workloads",
      });
    }

    for (const cache of cacheNodes) {
      const cfg = cache.data.config as any;
      if (cfg.hitRate < 0.5) {
        issues.push({
          severity: "warning",
          category: "Cache Efficiency",
          message: `Cache ${cache.data.label} has low hit rate (${(cfg.hitRate * 100).toFixed(0)}%)`,
          recommendation: "Increase cache size (sizeMB) or TTL (ttlSec) to improve hit rate",
          affectedNodes: [cache.id],
        });
      }
    }

    if (clientNodes.length > 0) {
      const totalFailed = packets.filter((p) => p.status === "error" || p.status === "timeout").length;
      const totalPackets = packets.length;

      if (totalPackets > 100 && totalFailed / totalPackets > 0.2) {
        issues.push({
          severity: "critical",
          category: "System Health",
          message: `High failure rate: ${(totalFailed / totalPackets * 100).toFixed(1)}% of requests failing`,
          recommendation: "Check server capacity, database limits, or add caching layer",
        });
      }
    }

    for (const client of clientNodes) {
      const cfg = client.data.config as any;
      if (cfg.rps > 10000 && serverNodes.length < 3) {
        issues.push({
          severity: "critical",
          category: "Capacity",
          message: `High RPS (${cfg.rps}) with insufficient servers`,
          recommendation: "Add more web servers behind a load balancer",
          affectedNodes: serverNodes.map((n) => n.id),
        });
      }
    }

    if (apiGateways.length > 0 && lbNodes.length === 0) {
      issues.push({
        severity: "warning",
        category: "Architecture",
        message: "API Gateway without Load Balancer",
        recommendation: "Add Load Balancer to distribute traffic across multiple API Gateways",
      });
    }

    for (const queue of messageQueueNodes) {
      const cfg = queue.data.config as any;
      const metrics = queue.data.metrics as any;
      const hasProducer = edges.some((e) => e.target === queue.id);
      const hasConsumer = edges.some((e) => e.source === queue.id);

      if (!hasProducer) {
        issues.push({
          severity: "warning",
          category: "Message Queue",
          message: `Message Queue ${queue.data.label} has no producer`,
          recommendation: "Connect a Client, API Gateway, or Web Server to this queue",
          affectedNodes: [queue.id],
        });
      }

      if (!hasConsumer) {
        issues.push({
          severity: "critical",
          category: "Message Queue",
          message: `Message Queue ${queue.data.label} has no consumer`,
          recommendation: "Connect a Web Server or downstream service after this queue",
          affectedNodes: [queue.id],
        });
      }

      if (metrics.queueDepth > cfg.maxQueueSize * 0.8) {
        issues.push({
          severity: "critical",
          category: "Message Queue",
          message: `Message Queue ${queue.data.label} is near capacity (${metrics.queueDepth}/${cfg.maxQueueSize})`,
          recommendation: "Increase processingRate, add consumers, or reduce upstream traffic",
          affectedNodes: [queue.id],
        });
      }

      if (cfg.processingRate < 100) {
        issues.push({
          severity: "warning",
          category: "Message Queue",
          message: `Message Queue ${queue.data.label} has low processing rate (${cfg.processingRate}/s)`,
          recommendation: "Increase processingRate to drain backlog faster",
          affectedNodes: [queue.id],
        });
      }
    }

    if (serverNodes.length > 0 && messageQueueNodes.length === 0) {
      issues.push({
        severity: "info",
        category: "Message Queue",
        message: "No message queue detected",
        recommendation: "Add a Message Queue for async jobs, background processing, or traffic buffering",
      });
    }

    return issues;
  }, [nodes, edges, packets, isRunning]);

  const criticalIssues = healthIssues.filter((i) => i.severity === "critical");
  const warningIssues = healthIssues.filter((i) => i.severity === "warning");
  const infoIssues = healthIssues.filter((i) => i.severity === "info");

  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      simulation: {
        isRunning,
        tickCount,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        packetCount: packets.length,
      },
      architecture: {
        clients: nodes.filter((n) => n.data.nodeType === "client").length,
        loadBalancers: nodes.filter((n) => n.data.nodeType === "loadBalancer").length,
        apiGateways: nodes.filter((n) => n.data.nodeType === "apiGateway").length,
        servers: nodes.filter((n) => n.data.nodeType === "webServer").length,
        caches: nodes.filter((n) => n.data.nodeType === "cache").length,
        databases: nodes.filter((n) => n.data.nodeType === "sqlDb" || n.data.nodeType === "noSqlDb").length,
        messageQueues: nodes.filter((n) => n.data.nodeType === "messageQueue").length,
      },
      issues: healthIssues,
      recommendations: healthIssues
        .filter((i) => i.severity === "critical" || i.severity === "warning")
        .map((i) => i.recommendation),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syscraft-health-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportIssuesMarkdown = () => {
    const md = `# SysCraft System Health Report

**Generated:** ${new Date().toISOString()}

## Summary
- **Nodes:** ${nodes.length}
- **Edges:** ${edges.length}
- **Active Packets:** ${packets.length}
- **Critical Issues:** ${criticalIssues.length}
- **Warnings:** ${warningIssues.length}

## Critical Issues
${criticalIssues.map((i) => `- **${i.category}**: ${i.message}\n  - Fix: ${i.recommendation}`).join("\n\n") || "None"}

## Warnings
${warningIssues.map((i) => `- **${i.category}**: ${i.message}\n  - Action: ${i.recommendation}`).join("\n\n") || "None"}

## Recommendations
${healthIssues.filter((i) => i.severity === "critical" || i.severity === "warning").map((i) => `- ${i.recommendation}`).join("\n") || "System is healthy - continue monitoring"}
`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syscraft-issues-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const autoFixCommonIssues = () => {
    const addLog = useSimulationStore.getState().addLog;
    
    for (const issue of healthIssues) {
      if (issue.category === "Reliability" && issue.message.includes("single point of failure")) {
        addLog("Recommendation: Add Load Balancer for high availability");
      }
      if (issue.category === "Cache Efficiency" && issue.message.includes("low hit rate")) {
        addLog("Recommendation: Increase cache size or TTL");
      }
      if (issue.category === "Database" && issue.message.includes("no replication")) {
        addLog("Recommendation: Enable master-slave replication");
      }
      if (issue.category === "Capacity" && issue.message.includes("queue is backing up")) {
        addLog("Critical: Add more servers immediately");
      }
      if (issue.category === "Message Queue" && issue.message.includes("no consumer")) {
        addLog("Critical: Add a consumer after the Message Queue");
      }
      if (issue.category === "Message Queue" && issue.message.includes("near capacity")) {
        addLog("Critical: Increase Message Queue processingRate or add consumers");
      }
      if (issue.category === "Message Queue" && issue.message.includes("low processing rate")) {
        addLog("Recommendation: Increase Message Queue processingRate");
      }
    }
    
    if (healthIssues.length === 0) {
      addLog("System is healthy, no auto-fixes needed");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Architecture":
      case "Reliability":
        return <Server className="h-3 w-3" />;
      case "Database":
      case "Cache Efficiency":
        return <Database className="h-3 w-3" />;
      case "Message Queue":
        return <Server className="h-3 w-3" />;
      default:
        return <ShieldAlert className="h-3 w-3" />;
    }
  };

  const header = (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
      <ShieldAlert className="h-4 w-4 text-body-mid" />
      <span className="text-[11px] font-normal uppercase tracking-wider text-body-mid">
        System Health & Feedback
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={autoFixCommonIssues}
          className="p-1.5 hover:bg-white/5 rounded transition-colors"
          title="Get Diagnostics"
        >
          <Activity className="h-3.5 w-3.5 text-body-mid" />
        </button>
        <button
          onClick={generateReport}
          className="p-1.5 hover:bg-white/5 rounded transition-colors"
          title="Export JSON Report"
        >
          <Download className="h-3.5 w-3.5 text-body-mid" />
        </button>
        <button
          onClick={exportIssuesMarkdown}
          className="p-1.5 hover:bg-white/5 rounded transition-colors"
          title="Export Issues (Markdown)"
        >
          <Bug className="h-3.5 w-3.5 text-body-mid" />
        </button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 hover:bg-white/5 rounded transition-colors"
          title={collapsed ? "Expand health panel" : "Collapse health panel"}
        >
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-body-mid" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-body-mid" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`${collapsed ? "" : "flex-1 min-h-0"} flex flex-col overflow-hidden`}>
      {header}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {healthIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm text-ink font-medium">System is healthy</p>
            <p className="text-xs text-body-mid mt-1">
              No issues detected. Your architecture is well-configured.
            </p>
          </div>
        )}

        {criticalIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
              <XCircle className="h-4 w-4" />
              <span>Critical ({criticalIssues.length})</span>
            </div>
            {criticalIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 space-y-2"
              >
                <div className="flex items-start gap-2">
                  {getCategoryIcon(issue.category)}
                  <div className="flex-1">
                    <p className="text-xs text-red-400 font-medium">{issue.category}</p>
                    <p className="text-xs text-ink mt-0.5">{issue.message}</p>
                    <p className="text-[11px] text-red-400/80 mt-1.5 bg-red-500/10 p-2 rounded">
                      <span className="font-medium">Fix:</span> {issue.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {warningIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>Warnings ({warningIssues.length})</span>
            </div>
            {warningIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2"
              >
                <div className="flex items-start gap-2">
                  {getCategoryIcon(issue.category)}
                  <div className="flex-1">
                    <p className="text-xs text-amber-400 font-medium">{issue.category}</p>
                    <p className="text-xs text-ink mt-0.5">{issue.message}</p>
                    <p className="text-[11px] text-amber-400/80 mt-1.5 bg-amber-500/10 p-2 rounded">
                      <span className="font-medium">Action:</span> {issue.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {infoIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
              <Activity className="h-4 w-4" />
              <span>Info ({infoIssues.length})</span>
            </div>
            {infoIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2"
              >
                <div className="flex items-start gap-2">
                  {getCategoryIcon(issue.category)}
                  <div className="flex-1">
                    <p className="text-xs text-blue-400 font-medium">{issue.category}</p>
                    <p className="text-xs text-ink mt-0.5">{issue.message}</p>
                    <p className="text-[11px] text-blue-400/80 mt-1.5 bg-blue-500/10 p-2 rounded">
                      <span className="font-medium">Tip:</span> {issue.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      <div className="px-4 py-3 border-t border-hairline bg-canvas-soft">
        <div className="flex items-center justify-between text-[10px] text-body-mid">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-400" />
              {criticalIssues.length}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              {warningIssues.length}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-blue-400" />
              {infoIssues.length}
            </span>
          </div>
          <span className="text-[10px]">
            {healthIssues.length === 0 ? "Healthy" : `${criticalIssues.length} critical, ${warningIssues.length} warnings`}
          </span>
        </div>
      </div>
    </div>
  );
}