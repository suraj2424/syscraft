"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes, edgeTypes } from "@/components/canvas/CustomNodes";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useEditorActions } from "@/hooks/useEditorActions";
import type { NodeType, SysCraftNode, SysCraftEdge } from "@/types/simulation";

function CanvasInner() {
  const nodes = useSimulationStore((s) => s.nodes);
  const edges = useSimulationStore((s) => s.edges);
  const selectedNodeId = useSimulationStore((s) => s.selectedNodeId);
  const selectNode = useSimulationStore((s) => s.selectNode);
  const addNode = useSimulationStore((s) => s.addNode);
  const selectedNodeIds = useSimulationStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useSimulationStore((s) => s.selectedEdgeIds);
  const setSelectedNodeIds = useSimulationStore((s) => s.setSelectedNodeIds);
  const setSelectedEdgeIds = useSimulationStore((s) => s.setSelectedEdgeIds);

  const editor = useEditorActions();
  const reactFlowInstance = useReactFlow();
  const selectedIdsRef = useRef<string[]>([]);
  const selectedEdgeIdsRef = useRef<string[]>([]);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const editorRef = useRef(editor);
  useEffect(() => {
    selectedIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);
  useEffect(() => {
    selectedEdgeIdsRef.current = selectedEdgeIds;
  }, [selectedEdgeIds]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable;
      if (isEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        editorRef.current.copy();
      } else if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        editorRef.current.commitCut();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        editorRef.current.paste();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        editorRef.current.selectAll();
      } else if (!e.shiftKey && mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        editorRef.current.undo();
      } else if (
        mod &&
        (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        editorRef.current.redo();
      } else if (!mod && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        editorRef.current.deleteSelected();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removeChange = changes.find((c) => c.type === "remove");
      const hadSelection = selectedIdsRef.current.length > 0;
      const isPositionOnly = changes.every(
        (c) => c.type === "position" || c.type === "select" || c.type === "dimensions",
      );
      if (removeChange) {
        editorRef.current.pushSnapshot();
      } else if (hadSelection && !isPositionOnly) {
        editorRef.current.pushSnapshot();
      }
      useSimulationStore.setState({
        nodes: applyNodeChanges(changes, nodesRef.current) as SysCraftNode[],
      });

      const selectChange = changes.find((c) => c.type === "select");

      if (selectChange && "selected" in selectChange) {
        const sc = selectChange as any;
        const current = selectedIdsRef.current;

        if (sc.selected) {
          setSelectedEdgeIds([]);
          if (!current.includes(sc.id)) {
            const next = [...current, sc.id];
            setSelectedNodeIds(next);
            selectNode(sc.id);
          }
        } else {
          const filtered = current.filter((id: string) => id !== sc.id);
          setSelectedNodeIds(filtered);
          if (current.includes(sc.id)) {
            selectNode(filtered[0] ?? null);
          }
        }
      }

      if (removeChange && selectedIdsRef.current.includes(removeChange.id)) {
        selectNode(null);
      }
    },
    [selectNode, setSelectedNodeIds, setSelectedEdgeIds],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      setSelectedEdgeIds([]);
      selectNode(node.id);
      setSelectedNodeIds([node.id]);
    },
    [selectNode, setSelectedNodeIds, setSelectedEdgeIds],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [selectNode, setSelectedNodeIds, setSelectedEdgeIds]);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { id: string }) => {
      selectNode(null);
      setSelectedNodeIds([]);
      setSelectedEdgeIds([edge.id]);
      useSimulationStore.setState((s) => ({
        edges: s.edges.map((e) =>
          e.id === edge.id
            ? { ...e, selected: true }
            : { ...e, selected: false },
        ),
      }));
    },
    [selectNode, setSelectedNodeIds, setSelectedEdgeIds],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removeChange = changes.find((c) => c.type === "remove");
      if (removeChange) {
        editorRef.current.pushSnapshot();
      }
      const deselectChange = changes.find(
        (c) => c.type === "select" && !(c as any).selected,
      );
      useSimulationStore.setState({
        edges: applyEdgeChanges(changes, edgesRef.current),
      });
      if (deselectChange) {
        const dc = deselectChange as any;
        const next = selectedEdgeIdsRef.current.filter((id) => id !== dc.id);
        setSelectedEdgeIds(next);
      }
    },
    [setSelectedEdgeIds],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      return true;
    },
    [],
  ) as any;

  const onConnect = useCallback(
    (connection: Connection) => {
      editorRef.current.pushSnapshot();
      const sh = connection.sourceHandle ?? "bottom-source";
      const th = connection.targetHandle ?? "top-target";
      useSimulationStore.setState({
        edges: addEdge(
          { ...connection, type: "packetEdge", sourceHandle: sh, targetHandle: th },
          edgesRef.current,
        ) as SysCraftEdge[],
      });
      useSimulationStore.getState().addLog(
        `Connected ${connection.source} → ${connection.target}`,
      );
    },
    [],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData(
        "application/syscraft-node",
      ) as NodeType;
      if (!nodeType) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      editorRef.current.pushSnapshot();
      addNode(nodeType, position);
    },
    [reactFlowInstance, addNode],
  );

  return (
    <>
      <style>{`
        .react-flow__controls {
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid #212327 !important;
        }
        .react-flow__controls button {
          background: #1a1c20 !important;
          color: #dadbdf !important;
          border-bottom: 1px solid #212327 !important;
          width: 28px !important;
          height: 28px !important;
        }
        .react-flow__controls button:hover {
          background: #363a3f !important;
          color: #ffffff !important;
        }
        .react-flow__controls button svg {
          fill: currentColor !important;
        }
        .react-flow__minimap {
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid #212327 !important;
          background: #0a0a0a !important;
        }
        .react-flow__minimap .react-flow__minimap-mask {
          fill: rgba(255, 255, 255, 0.05) !important;
        }
        .react-flow__minimap .react-flow__minimap-node {
          fill: #7d8187 !important;
          stroke: none !important;
        }
        .react-flow__edge-path {
          stroke: #363a3f !important;
          stroke-width: 2 !important;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #ffffff !important;
          stroke-width: 2 !important;
        }
        .react-flow__handle {
          background: #ffffff !important;
          border: 2px solid #0a0a0a !important;
          width: 10px !important;
          height: 10px !important;
        }
        .node-handle:hover {
          width: 16px !important;
          height: 16px !important;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.15) !important;
        }
        .react-flow__handle.node-handle.react-flow__handle-connecting {
          width: 16px !important;
          height: 16px !important;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.25) !important;
        }
      `}</style>
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          isValidConnection={isValidConnection}
          snapToGrid={true}
          snapGrid={[10, 10]}
          minZoom={0.3}
          maxZoom={2}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className="w-full h-full"
          proOptions={{ hideAttribution: true }}
          panOnDrag={true}
          selectionOnDrag={true}
        >
          <Controls
            position="top-right"
            showZoom
            showFitView
            showInteractive={false}
          />
          <MiniMap
            position="bottom-right"
            style={{ borderRadius: 8, width: 140, height: 100 }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#363a3f" />
        </ReactFlow>
      </div>
    </>
  );
}

export function SystemCanvas() {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
