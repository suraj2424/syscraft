/* eslint-disable @typescript-eslint/no-explicit-any */
import { type StateCreator } from "zustand";
import { applyNodeChanges, applyEdgeChanges, type Connection, type NodeChange, type EdgeChange } from "@xyflow/react";
import { type SysCraftNode, type SysCraftEdge, type NodeType } from "@/types/simulation";
import { defaultConfig, defaultMetrics, nodeLabels } from "@/model/nodeDefaults";
import { type SysCraftStore, type ActivePanel } from "./types";

export const createCanvasSlice: StateCreator<SysCraftStore, [], [], any> = (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  onNodesChange: (changes: NodeChange[]) => {
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes) as SysCraftNode[],
    }));
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges) as SysCraftEdge[],
    }));
  },

  onConnect: (connection: Connection) => {
    const sh = connection.sourceHandle ?? "bottom-source";
    const th = connection.targetHandle ?? "top-target";

    const isSourceHandleValid = sh === "bottom-source";
    const isTargetHandleValid = th === "top-target";
    const isSameNode = connection.source === connection.target;
    const edgeAlreadyExists = get().edges.some(
      (e) => e.source === connection.source && e.sourceHandle === sh && e.target === connection.target && e.targetHandle === th
    );
    const wouldCreateCycle = connection.target === "scenario-client" || connection.target === "sc-client" || connection.target === "spof-client";

    if (!isSourceHandleValid || !isTargetHandleValid) {
      return;
    }
    if (isSameNode) {
      return;
    }
    if (edgeAlreadyExists) {
      return;
    }
    if (wouldCreateCycle) {
      return;
    }

    set((s) => ({
      edges: [
        ...s.edges,
        {
          ...connection,
          id: `${connection.source}-${sh}-${connection.target}-${th}`,
          type: "packetEdge",
          sourceHandle: sh,
          targetHandle: th,
          config: {
            latencyMs: 50,
            jitterMs: 10,
            packetLossRate: 0,
          },
        } as SysCraftEdge,
      ],
    }));
  },

  addNode: (nodeType: NodeType, position: { x: number; y: number }) => {
    const id = `${nodeType}-${Date.now()}`;
    const newNode: SysCraftNode = {
      id,
      type: nodeType,
      position,
      data: {
        nodeType,
        label: nodeLabels[nodeType],
        config: defaultConfig(nodeType),
        metrics: defaultMetrics(nodeType),
      },
    };
    set((s) => ({ nodes: [...s.nodes, newNode] }));
    get().addLog(`Added ${nodeLabels[nodeType]} node`);
  },

  removeNode: (id: string) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      packets: s.packets.filter(
        (p) => !p.path.includes(id) && p.path[0] !== id,
      ),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
    get().addLog(`Removed node ${id}`);
  },

  selectNode: (id: string | null) => {
    set((s) => ({
      selectedNodeId: id,
      activePanel: id ? "config" : s.activePanel,
    }));
  },

  setSelectedNodeIds: (ids: string[]) => {
    set({ selectedNodeIds: ids, selectedNodeId: ids.length === 1 ? ids[0] : null });
  },

  setSelectedEdgeIds: (ids: string[]) => {
    set({ selectedEdgeIds: ids });
  },

  removeEdge: (id: string) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
    }));
    get().addLog(`Removed edge ${id}`);
  },

  updateNodeConfig: (id: string, config: any) => {
    get().pushSnapshot();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n,
      ),
    }));
    get().addLog(`Updated config for ${id}`);
  },

  updateEdgeConfig: (id: string, config: any) => {
    get().pushSnapshot();
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id ? { ...e, config: { ...e.config, ...config } } : e,
      ),
    }));
    get().addLog(`Updated config for edge ${id}`);
  },

  setActivePanel: (panel: ActivePanel) => {
    set({ activePanel: panel });
  },

  pushSnapshot: () => {
    const { nodes, edges, past } = get();
    const snapshot = JSON.parse(JSON.stringify({ nodes, edges }));
    const newPast = [...past, snapshot];
    if (newPast.length > 50) {
      newPast.shift();
    }
    set({
      past: newPast,
      future: [],
      canUndo: newPast.length > 0,
      canRedo: false,
    });
  },

  undo: () => {
    const { nodes, edges, past, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const currentSnapshot = JSON.parse(JSON.stringify({ nodes, edges }));
    const newFuture = [currentSnapshot, ...future];
    set({
      nodes: previous.nodes.map((n) => ({ ...n, selected: false })),
      edges: previous.edges.map((e) => ({ ...e, selected: false })),
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: newFuture.length > 0,
    });
    get().addLog("Undo");
  },

  redo: () => {
    const { nodes, edges, past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const currentSnapshot = JSON.parse(JSON.stringify({ nodes, edges }));
    const newPast = [...past, currentSnapshot];
    set({
      nodes: next.nodes.map((n) => ({ ...n, selected: false })),
      edges: next.edges.map((e) => ({ ...e, selected: false })),
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: newFuture.length > 0,
    });
    get().addLog("Redo");
  },

  clearHistory: () => {
    set({ past: [], future: [], canUndo: false, canRedo: false });
  },
});

