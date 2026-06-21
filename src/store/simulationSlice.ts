/* eslint-disable @typescript-eslint/no-explicit-any */
import { type StateCreator } from "zustand";
import {
  type ClientConfig,
  type LoadBalancerConfig,
  type ServerConfig,
  type ApiGatewayConfig,
  type DatabaseConfig,
  type LoadBalancerMetrics,
  type ServerMetrics,
} from "@/types/simulation";
import { resetNodeMetrics } from "@/model/nodeDefaults";
import { isTerminalPacket, resetSimulationState, resetProcessorState } from "./packetProcessor";
import { updateNodeMetrics } from "./metricsUpdater";
import { spawnClientPackets, advanceActivePackets, trimPackets } from "./tickHelpers";
import { SCENARIOS } from "./scenarios";
import { type SysCraftStore, type ActivePanel } from "./types";
import { resetRoutingState } from "./packetRouting";


let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
let lastTickTime = 0;
let spikeTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Token buckets for rate limiting
const apiGatewayTokens = new Map<string, number>();
const dbReadTokens = new Map<string, number>();
const dbWriteTokens = new Map<string, number>();

function resetTokens() {
  apiGatewayTokens.clear();
  dbReadTokens.clear();
  dbWriteTokens.clear();
  resetRoutingState();
  resetProcessorState();
}

export const createSimulationSlice: StateCreator<SysCraftStore, [], [], any> = (set, get) => ({
  simulation: {
    isRunning: false, speed: 1, tickCount: 0, globalTime: 0,
    logs: ["Welcome to SysCraft — System Design Simulator. Drag components to start designing."],
  },
  packets: [], activeScenario: null, showScenarioPanel: false, activePanel: "config" as ActivePanel, scenarios: SCENARIOS,

  playSimulation: () => {
    if (get().nodes.length === 0 || rafId) return;
    set((s) => ({ simulation: { ...s.simulation, isRunning: true } }));
    get().addLog("▶ Simulation started");
    const tickRate = 1000 / 20;
    lastTickTime = performance.now();
    const loop = (now: number) => {
      if (!get().simulation.isRunning) return;
      const delta = now - lastTickTime;
      if (delta >= tickRate) {
        lastTickTime = now - (delta % tickRate);
        get().tick();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  },

  pauseSimulation: () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (spikeTimeoutId) { clearTimeout(spikeTimeoutId); spikeTimeoutId = null; }
    const wasRunning = get().simulation.isRunning;
    set((s) => ({ simulation: { ...s.simulation, isRunning: false } }));
    if (wasRunning) get().addLog("⏸ Simulation paused");
  },

  stopSimulation: () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (spikeTimeoutId) { clearTimeout(spikeTimeoutId); spikeTimeoutId = null; }
    resetTokens();
    set((s) => ({ simulation: resetSimulationState(s.simulation.logs), packets: [], nodes: resetNodeMetrics(s.nodes) }));
    get().addLog("⏹ Simulation stopped");
  },

  setSpeed: (speed: 1 | 2 | 5) => {
    set((s) => ({ simulation: { ...s.simulation, speed } }));
    get().addLog(`Speed set to ${speed}×`);
  },

  tick: () => {
    if (!get().simulation.isRunning) return;

    const { nodes, edges, packets, simulation } = get();
    const speed = simulation.speed;
    const tickCount = simulation.tickCount;

    // 1. Refill rate limit token buckets
    for (const node of nodes) {
      if (node.data.nodeType === "apiGateway") {
        const cfg = node.data.config as ApiGatewayConfig;
        const current = apiGatewayTokens.get(node.id) ?? 0;
        apiGatewayTokens.set(node.id, Math.min(cfg.rateLimitRps, current + (cfg.rateLimitRps * speed) / 20));
      } else if (node.data.nodeType === "sqlDb" || node.data.nodeType === "noSqlDb") {
        const cfg = node.data.config as DatabaseConfig;
        const readCurrent = dbReadTokens.get(node.id) ?? 0;
        dbReadTokens.set(node.id, Math.min(cfg.maxReadThroughput, readCurrent + (cfg.maxReadThroughput * speed) / 20));
        const writeCurrent = dbWriteTokens.get(node.id) ?? 0;
        dbWriteTokens.set(node.id, Math.min(cfg.maxWriteThroughput, writeCurrent + (cfg.maxWriteThroughput * speed) / 20));
      }
    }

    // 2. Spawn new packets from client nodes
    const { newPackets } = spawnClientPackets(nodes, packets, speed, tickCount);

    // 3. Separate active and terminated packets
    const activePackets = packets.filter((p) => !isTerminalPacket(p));
    const terminatedPackets = packets.filter((p) => isTerminalPacket(p));

    // 4. Build the live counts map of active packets currently at each node
    const liveCounts = new Map<string, number>();
    for (const p of activePackets) {
      if (p.path.length === 0) continue;
      const lastNodeId = p.path[p.path.length - 1];
      liveCounts.set(lastNodeId, (liveCounts.get(lastNodeId) ?? 0) + 1);
    }

    // 5. Advance active packets (using dynamic counts & token buckets)
    const advancedPackets = advanceActivePackets(
      activePackets,
      nodes,
      edges,
      speed,
      liveCounts,
      packets,
      apiGatewayTokens,
      dbReadTokens,
      dbWriteTokens
    );

    // 6. Trim packet history buffer and update metrics
    const trimmedPackets = trimPackets(newPackets, advancedPackets, terminatedPackets, tickCount);
    const updatedNodes = updateNodeMetrics(nodes, trimmedPackets);

    // 7. Update additional node-specific configuration updates or metrics details
    const finalNodes = updatedNodes.map((n) => {
      if (n.data.nodeType === "loadBalancer") {
        const cfg = n.data.config as LoadBalancerConfig;
        const outEdges = edges.filter((e) => e.source === n.id);
        const connectionDistribution = outEdges.reduce<Record<string, number>>((acc, e) => {
          acc[e.target] = (acc[e.target] || 0) + 1;
          return acc;
        }, {});
        return {
          ...n,
          data: {
            ...n.data,
            metrics: { ...n.data.metrics, connectionDistribution } as LoadBalancerMetrics,
          },
        };
      }
      if (n.data.nodeType === "webServer") {
        const cfg = n.data.config as ServerConfig;
        return {
          ...n,
          data: { ...n.data, config: { ...cfg, currentQueue: (n.data.metrics as ServerMetrics).queueSize } },
        };
      }
      return n;
    });

    set({
      packets: trimmedPackets, nodes: finalNodes,
      simulation: { ...simulation, tickCount: tickCount + 1, globalTime: simulation.globalTime + 100 * speed },
    });
  },

  spawnTrafficSpike: (multiplier: number) => {
    if (spikeTimeoutId) { clearTimeout(spikeTimeoutId); spikeTimeoutId = null; }
    set((s) => ({ nodes: s.nodes.map((n) => n.data.nodeType === "client" ? { ...n, data: { ...n.data, config: { ...n.data.config, rps: (n.data.config as ClientConfig).rps * multiplier } } } : n) }));
    get().addLog(`⚡ Traffic spike! RPS multiplied by ${multiplier}`);
    spikeTimeoutId = setTimeout(() => {
      set((s) => ({ nodes: s.nodes.map((n) => n.data.nodeType === "client" ? { ...n, data: { ...n.data, config: { ...n.data.config, rps: Math.round((n.data.config as ClientConfig).rps / multiplier) } } } : n) }));
      get().addLog("Traffic spike subsided");
      spikeTimeoutId = null;
    }, 5000);
  },

  loadScenario: (id: string) => {
    const scenario = SCENARIOS[id];
    if (!scenario) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    resetTokens();
    set({
      nodes: JSON.parse(JSON.stringify(scenario.nodes)), edges: JSON.parse(JSON.stringify(scenario.edges)),
      selectedNodeId: null, selectedNodeIds: [], selectedEdgeIds: [], activeScenario: id, showScenarioPanel: true, packets: [],
      simulation: { isRunning: false, speed: 1, tickCount: 0, globalTime: 0, logs: [`📚 Loaded scenario: ${scenario.name}. ${scenario.goal}`] },
    });
  },

  clearScenario: () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    resetTokens();
    set({
      activeScenario: null, showScenarioPanel: false, nodes: [], edges: [], selectedNodeId: null, selectedNodeIds: [], selectedEdgeIds: [], packets: [],
      simulation: { isRunning: false, speed: 1, tickCount: 0, globalTime: 0, logs: ["Canvas cleared. Drag components to start designing."] },
    });
  },

  addLog: (msg: string) => {
    set((s) => ({ simulation: { ...s.simulation, logs: [...s.simulation.logs.slice(-99), `[T${s.simulation.tickCount}] ${msg}`] } }));
  },
});
