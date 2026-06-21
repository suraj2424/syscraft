"use client";

import { useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useHistoryState } from "@/hooks/useHistoryState";
import type { SysCraftNode, SysCraftEdge } from "@/types/simulation";

export function useEditorActions() {
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useHistoryState();
  const clipboardRef = useRef<{ nodes: SysCraftNode[]; edges: SysCraftEdge[] } | null>(null);

  const clearSelection = useCallback(() => {
    useSimulationStore.setState({
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  }, []);

  const getSelected = useCallback(() => {
    const state = useSimulationStore.getState();
    const nodeIdsSet = new Set(state.selectedNodeIds);
    const edgeIdsSet = new Set(state.selectedEdgeIds);
    const selectedNodes = state.nodes.filter((n) => nodeIdsSet.has(n.id));
    const directlySelectedEdges = state.edges.filter((e) => edgeIdsSet.has(e.id));
    const edgesConnectedToSelectedNodes = state.edges.filter(
      (e) => nodeIdsSet.has(e.source) && nodeIdsSet.has(e.target),
    );
    const edgeIds = new Set<string>();
    const mergedEdges: SysCraftEdge[] = [];
    for (const e of directlySelectedEdges) {
      if (!edgeIds.has(e.id)) {
        edgeIds.add(e.id);
        mergedEdges.push(e);
      }
    }
    for (const e of edgesConnectedToSelectedNodes) {
      if (!edgeIds.has(e.id)) {
        edgeIds.add(e.id);
        mergedEdges.push(e);
      }
    }
    return {
      ids: state.selectedNodeIds,
      edgeIds: state.selectedEdgeIds,
      nodes: selectedNodes,
      edges: mergedEdges,
    };
  }, []);

  const copy = useCallback(() => {
    const { nodes: selNodes } = getSelected();
    if (selNodes.length === 0) return;
    const state = useSimulationStore.getState();
    const selEdges = state.edges.filter(
      (e) =>
        new Set(selNodes.map((n) => n.id)).has(e.source) &&
        new Set(selNodes.map((n) => n.id)).has(e.target),
    );
    clipboardRef.current = JSON.parse(JSON.stringify({ nodes: selNodes, edges: selEdges }));
    state.addLog(`Copied ${selNodes.length} node(s)`);
  }, [getSelected]);

  const cut = useCallback(() => {
    const { ids, edgeIds } = getSelected();
    if (ids.length === 0 && edgeIds.length === 0) return;
    copy();
    const nodeIdSet = new Set(ids);
    const edgeIdSet = new Set(edgeIds);
    useSimulationStore.setState((s) => ({
      nodes: s.nodes.filter((n) => !nodeIdSet.has(n.id)),
      edges: s.edges.filter(
        (e) => !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target) && !edgeIdSet.has(e.id),
      ),
    }));
    clearSelection();
    useSimulationStore.getState().addLog(`Cut ${ids.length} node(s) and ${edgeIds.length} edge(s)`);
  }, [copy, getSelected, clearSelection]);

  const paste = useCallback(() => {
    if (!clipboardRef.current) return;

    const { nodes } = useSimulationStore.getState();
    const { nodes: srcNodes, edges: srcEdges } = clipboardRef.current;

    const cleared = nodes.map((n) => ({ ...n, selected: false }));

    const idMap = new Map<string, string>();
    const newNodes: SysCraftNode[] = [];
    const newEdges: SysCraftEdge[] = [];

    srcNodes.forEach((n) => {
      const newId = `${n.data.nodeType}-${uuidv4().slice(0, 8)}`;
      idMap.set(n.id, newId);
      newNodes.push({
        ...n,
        id: newId,
        selected: true,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        data: { ...n.data },
      } as SysCraftNode);
    });

    srcEdges.forEach((e) => {
      const newSource = idMap.get(e.source);
      const newTarget = idMap.get(e.target);
      if (newSource && newTarget) {
        newEdges.push({
          ...e,
          id: `edge-${newSource}-${newTarget}`,
          source: newSource,
          target: newTarget,
        } as SysCraftEdge);
      }
    });

    const newIds = newNodes.map((n) => n.id);
    useSimulationStore.setState((s) => ({
      nodes: [...cleared, ...newNodes],
      edges: [...s.edges, ...newEdges],
      selectedNodeIds: newIds,
      selectedNodeId: newIds[0] ?? null,
      selectedEdgeIds: [],
    }));
    useSimulationStore.getState().addLog(`Pasted ${newNodes.length} node(s)`);
  }, []);

  const deleteSelected = useCallback(() => {
    const { ids, edgeIds } = getSelected();
    if (ids.length === 0 && edgeIds.length === 0) return;
    const nodeIdSet = new Set(ids);
    const edgeIdSet = new Set(edgeIds);
    useSimulationStore.setState((s) => ({
      nodes: s.nodes.filter((n) => !nodeIdSet.has(n.id)),
      edges: s.edges.filter(
        (e) => !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target) && !edgeIdSet.has(e.id),
      ),
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    }));
    useSimulationStore.getState().addLog(
      `Deleted ${ids.length} node(s) and ${edgeIds.length} edge(s)`,
    );
  }, [getSelected]);

  const commitPaste = useCallback(() => { pushSnapshot(); paste(); }, [pushSnapshot, paste]);
  const commitCut = useCallback(() => { pushSnapshot(); cut(); }, [pushSnapshot, cut]);
  const commitDelete = useCallback(() => { pushSnapshot(); deleteSelected(); }, [pushSnapshot, deleteSelected]);

  const selectAll = useCallback(() => {
    const state = useSimulationStore.getState();
    useSimulationStore.setState({
      selectedNodeIds: state.nodes.map((n) => n.id),
      selectedNodeId: state.nodes[0]?.id ?? null,
      selectedEdgeIds: [],
    });
    useSimulationStore.getState().addLog("Selected all");
  }, []);

  return useMemo(
    () => ({
      copy,
      cut,
      commitCut,
      paste: commitPaste,
      deleteSelected: commitDelete,
      undo,
      redo,
      selectAll,
      pushSnapshot,
      canUndo,
      canRedo,
    }),
    [copy, cut, commitCut, commitPaste, commitDelete, undo, redo, selectAll, pushSnapshot, canUndo, canRedo],
  );
}
