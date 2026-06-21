/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Connection, type EdgeChange, type NodeChange } from "@xyflow/react";
import {
  type SysCraftNode,
  type SysCraftEdge,
  type Packet,
  type NodeType,
  type SimState,
} from "@/types/simulation";
import { SCENARIOS } from "./scenarios";

export type ActivePanel = "config" | "health" | "logs" | "sla" | null;

export interface SysCraftStore {
  // React Flow State
  nodes: SysCraftNode[];
  edges: SysCraftEdge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // History State
  past: { nodes: SysCraftNode[]; edges: SysCraftEdge[] }[];
  future: { nodes: SysCraftNode[]; edges: SysCraftEdge[] }[];
  canUndo: boolean;
  canRedo: boolean;

  // Simulation State
  simulation: SimState;
  packets: Packet[];

  // UI State
  activeScenario: string | null;
  showScenarioPanel: boolean;
  activePanel: ActivePanel;

  // Actions — Canvas
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedEdgeIds: (ids: string[]) => void;
  removeEdge: (id: string) => void;
  updateNodeConfig: (id: string, config: any) => void;
  updateEdgeConfig: (id: string, config: any) => void;
  setActivePanel: (panel: ActivePanel) => void;

  // Actions — History
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Actions — Simulation
  playSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  setSpeed: (speed: 1 | 2 | 5) => void;
  tick: () => void;
  spawnTrafficSpike: (multiplier: number) => void;

  // Actions — Scenarios
  loadScenario: (id: string) => void;
  clearScenario: () => void;
  scenarios: typeof SCENARIOS;

  // Actions — Log
  addLog: (msg: string) => void;
}

