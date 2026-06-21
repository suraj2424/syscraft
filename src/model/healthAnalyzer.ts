import type { SysCraftNode, SysCraftEdge, Packet, HealthIssue } from "@/types/simulation";

export function analyzeHealth(
  nodes: SysCraftNode[],
  edges: SysCraftEdge[],
  packets: Packet[],
  isRunning: boolean,
  tickCount: number,
): HealthIssue[] {
  const issues: HealthIssue[] = []

  if (nodes.length === 0) {
    issues.push({ severity: "critical", category: "Configuration", message: "No system components deployed", recommendation: "Add at least a Client and backend service to start simulation" })
    return issues
  }

  if (!isRunning) {
    issues.push({ severity: "info", category: "State", message: "Simulation is paused", recommendation: "Click Play to start traffic flow and observe system behavior" })
  }

  const clients = nodes.filter((n) => n.data.nodeType === "client")
  const servers = nodes.filter((n) => n.data.nodeType === "webServer")
  const lbs = nodes.filter((n) => n.data.nodeType === "loadBalancer")
  const dbs = nodes.filter((n) => n.data.nodeType === "sqlDb" || n.data.nodeType === "noSqlDb")
  const caches = nodes.filter((n) => n.data.nodeType === "cache")
  const gateways = nodes.filter((n) => n.data.nodeType === "apiGateway")
  const queues = nodes.filter((n) => n.data.nodeType === "messageQueue")

  if (clients.length > 0 && servers.length === 0 && dbs.length === 0) {
    issues.push({ severity: "critical", category: "Architecture", message: "Clients deployed without backend services", recommendation: "Add Web Servers, Databases, or Caches to handle client requests", affectedNodes: clients.map((n) => n.id) })
  }

  if (servers.length === 1 && lbs.length === 0) {
    issues.push({ severity: "warning", category: "Reliability", message: "Single server is a single point of failure", recommendation: "Add a Load Balancer and multiple servers for high availability", affectedNodes: servers.map((n) => n.id) })
  }

  for (const server of servers) {
    const cfg = server.data.config as any
    const metrics = server.data.metrics as any
    if (cfg.failureRate > 0.1) issues.push({ severity: "critical", category: "Server Health", message: `Server ${server.data.label} has high failure rate (${(cfg.failureRate * 100).toFixed(0)}%)`, recommendation: "Reduce failure rate or add redundancy", affectedNodes: [server.id] })
    if (metrics.cpuLoad > 80) issues.push({ severity: "warning", category: "Server Health", message: `Server ${server.data.label} is under heavy load (${metrics.cpuLoad}% CPU)`, recommendation: "Scale horizontally by adding more servers or increase maxConcurrent", affectedNodes: [server.id] })
    if (metrics.queueSize > cfg.maxConcurrent * 0.5) issues.push({ severity: "critical", category: "Capacity", message: `Server ${server.data.label} queue is backing up (${metrics.queueSize} pending)`, recommendation: "Immediately add more servers or reduce client RPS", affectedNodes: [server.id] })
  }

  for (const db of dbs) {
    if ((db.data.config as any).replicationMode === "single") issues.push({ severity: "warning", category: "Database", message: `Database ${db.data.label} has no replication`, recommendation: "Enable master-slave replication for fault tolerance", affectedNodes: [db.id] })
  }

  if (servers.length > 0 && dbs.length > 0 && caches.length === 0) {
    issues.push({ severity: "info", category: "Performance", message: "No cache layer detected", recommendation: "Add a Cache node to reduce database load for read-heavy workloads" })
  }

  for (const cache of caches) {
    if ((cache.data.config as any).hitRate < 0.5) issues.push({ severity: "warning", category: "Cache Efficiency", message: `Cache ${cache.data.label} has low hit rate (${((cache.data.config as any).hitRate * 100).toFixed(0)}%)`, recommendation: "Increase cache size (sizeMB) or TTL (ttlSec) to improve hit rate", affectedNodes: [cache.id] })
  }

  if (clients.length > 0) {
    const totalFailed = packets.filter((p) => p.status === "error" || p.status === "timeout").length
    const totalPackets = packets.length
    if (totalPackets > 100 && totalFailed / totalPackets > 0.2) issues.push({ severity: "critical", category: "System Health", message: `High failure rate: ${(totalFailed / totalPackets * 100).toFixed(1)}% of requests failing`, recommendation: "Check server capacity, database limits, or add caching layer" })
  }

  for (const client of clients) {
    if ((client.data.config as any).rps > 10000 && servers.length < 3) issues.push({ severity: "critical", category: "Capacity", message: `High RPS (${(client.data.config as any).rps}) with insufficient servers`, recommendation: "Add more web servers behind a load balancer", affectedNodes: servers.map((n) => n.id) })
  }

  if (gateways.length > 0 && lbs.length === 0) {
    issues.push({ severity: "warning", category: "Architecture", message: "API Gateway without Load Balancer", recommendation: "Add Load Balancer to distribute traffic across multiple API Gateways" })
  }

  for (const queue of queues) {
    const cfg = queue.data.config as any
    const metrics = queue.data.metrics as any
    const hasProducer = edges.some((e) => e.target === queue.id)
    const hasConsumer = edges.some((e) => e.source === queue.id)
    if (!hasProducer) issues.push({ severity: "warning", category: "Message Queue", message: `Message Queue ${queue.data.label} has no producer`, recommendation: "Connect a Client, API Gateway, or Web Server to this queue", affectedNodes: [queue.id] })
    if (!hasConsumer) issues.push({ severity: "critical", category: "Message Queue", message: `Message Queue ${queue.data.label} has no consumer`, recommendation: "Connect a Web Server or downstream service after this queue", affectedNodes: [queue.id] })
    if (metrics.queueDepth > cfg.maxQueueSize * 0.8) issues.push({ severity: "critical", category: "Message Queue", message: `Message Queue ${queue.data.label} is near capacity (${metrics.queueDepth}/${cfg.maxQueueSize})`, recommendation: "Increase processingRate, add consumers, or reduce upstream traffic", affectedNodes: [queue.id] })
    if (cfg.processingRate < 100) issues.push({ severity: "warning", category: "Message Queue", message: `Message Queue ${queue.data.label} has low processing rate (${cfg.processingRate}/s)`, recommendation: "Increase processingRate to drain backlog faster", affectedNodes: [queue.id] })
  }

  if (servers.length > 0 && queues.length === 0) {
    issues.push({ severity: "info", category: "Message Queue", message: "No message queue detected", recommendation: "Add a Message Queue for async jobs, background processing, or traffic buffering" })
  }

  return issues
}

const categoryIconMap: Record<string, string> = {
  Architecture: "Server",
  Reliability: "Server",
  Database: "Database",
  "Cache Efficiency": "Database",
  "Message Queue": "Server",
}

export function getCategoryIcon(category: string): string {
  return categoryIconMap[category] || "ShieldAlert"
}
