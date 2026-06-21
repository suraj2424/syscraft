/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SysCraftNode, SysCraftEdge, Packet, NodeType } from "@/types/simulation";
import { type Connection } from "@xyflow/react";
import { defaultConfig, defaultMetrics, nodeLabels } from "@/model/nodeDefaults";

export function addNode(state: any, nodeType: string, position: { x: number; y: number }) {
  const id = `${nodeType}-${Date.now()}`;
  const node: any = {
    id,
    type: nodeType,
    position,
    data: {
      nodeType,
      label: nodeLabels[nodeType as NodeType],
      config: defaultConfig(nodeType as NodeType),
      metrics: defaultMetrics(nodeType as NodeType),
    },
  };
  return {
    ...state,
    nodes: [...state.nodes, node],
    logs: [...state.logs, `Added ${nodeLabels[nodeType as NodeType]} node`],
  };
}

export function removeNode(state: any, id: string) {
  return {
    ...state,
    nodes: state.nodes.filter((n: SysCraftNode) => n.id !== id),
    edges: state.edges.filter((e: SysCraftEdge) => e.source !== id && e.target !== id),
    packets: state.packets.filter((p: Packet) => !p.path.includes(id) && p.path[0] !== id),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
  };
}

export function connectEdges(edges: SysCraftEdge[], conn: Connection) {
  const sh = conn.sourceHandle ?? "bottom-source";
  const th = conn.targetHandle ?? "top-target";
  const exists = edges.some((e) => e.source === conn.source && e.target === conn.target && e.targetHandle === "top-target");
  if (exists) return edges;
  return [
    ...edges,
    {
      ...conn,
      id: `${conn.source}-${sh}-${conn.target}-${th}`,
      type: "packetEdge",
      sourceHandle: sh,
      targetHandle: th,
    } as SysCraftEdge,
  ];
}

export function updateNodeConfig(nodes: SysCraftNode[], id: string, patch: any) {
  return {
    nodes: nodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } } : n
    ),
  };
}
