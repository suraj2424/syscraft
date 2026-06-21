/* eslint-disable @typescript-eslint/no-explicit-any */
import { type HealthIssue } from "@/components/panels/HealthIssuesLists";

export function generateReport(
  nodes: any[],
  edges: any[],
  packets: any[],
  isRunning: boolean,
  tickCount: number,
  healthIssues: HealthIssue[],
) {
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
}

export function exportIssuesMarkdown(
  nodes: any[],
  edges: any[],
  packets: any[],
  healthIssues: HealthIssue[],
  criticalIssues: HealthIssue[],
  warningIssues: HealthIssue[],
) {
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
}

export function autoFixCommonIssues(healthIssues: HealthIssue[], addLog: (msg: string) => void) {
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
}
