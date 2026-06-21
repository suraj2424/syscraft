/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-expressions */
"use client"

import { useCallback, useEffect, useRef } from "react"
import { useReactFlow, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange, type Connection } from "@xyflow/react"
import { useSimulationStore } from "@/store/useSimulationStore"
import { useEditorActions } from "@/hooks/useEditorActions"
import type { NodeType } from "@/types/simulation"
import { nodeTypes, edgeTypes } from "@/components/canvas/CustomNodes"

export function useCanvasHandlers() {
  const { selectNode, setSelectedNodeIds, setSelectedEdgeIds } = useSimulationStore()
  const editor = useEditorActions()
  const reactFlowInstance = useReactFlow()
  const nodesRef = useRef<any[]>([])
  const edgesRef = useRef<any[]>([])
  const editorRef = useRef(editor)

  // Keep refs in sync with store
  useEffect(() => {
    const store = useSimulationStore.getState()
    nodesRef.current = store.nodes
    edgesRef.current = store.edges
    editorRef.current = editor
  }, [editor])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "c") e.preventDefault(), editorRef.current.copy()
      else if (mod && e.key.toLowerCase() === "x") e.preventDefault(), editorRef.current.commitCut()
      else if (mod && e.key.toLowerCase() === "v") e.preventDefault(), editorRef.current.paste()
      else if (mod && e.key.toLowerCase() === "a") e.preventDefault(), editorRef.current.selectAll()
      else if (!e.shiftKey && mod && e.key.toLowerCase() === "z") e.preventDefault(), editorRef.current.undo()
      else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) e.preventDefault(), editorRef.current.redo()
      else if (!mod && (e.key === "Delete" || e.key === "Backspace")) e.preventDefault(), editorRef.current.deleteSelected()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const onNodeDragStart = useCallback(() => editorRef.current.pushSnapshot(), [])
  const onNodeDragStop = useCallback((_e: any, node: any) => {
    const updated = nodesRef.current.map((n) => n.id === node.id ? { ...n, position: node.position } : n)
    useSimulationStore.setState({ nodes: updated })
  }, [])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const hasRemoval = changes.some((c) => c.type === "remove");
    if (hasRemoval) {
      editorRef.current.pushSnapshot();
    }
    const current = useSimulationStore.getState().nodes
    // @ts-ignore
    useSimulationStore.setState({ nodes: applyNodeChanges(changes, current) })
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const hasRemoval = changes.some((c) => c.type === "remove");
    if (hasRemoval) {
      editorRef.current.pushSnapshot();
    }
    const current = useSimulationStore.getState().edges
    // @ts-ignore
    useSimulationStore.setState({ edges: applyEdgeChanges(changes, current) })
  }, [])


  const isValidConnection = useCallback((connection: any) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false
    if ((connection.sourceHandle ?? "bottom-source") !== "bottom-source") return false
    if ((connection.targetHandle ?? "top-target") !== "top-target") return false
    const current = useSimulationStore.getState()
    if (current.nodes.find((n) => n.id === connection.target)?.data.nodeType === "client") return false
    return !current.edges.some((e) => e.source === connection.source && e.target === connection.target && e.targetHandle === "top-target")
  }, [])

  const handleConnect = useCallback((connection: Connection) => {
    editorRef.current.pushSnapshot()
    useSimulationStore.getState().onConnect(connection)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData("application/syscraft-node") as NodeType
    if (!nodeType) return
    const bounds = e.currentTarget.getBoundingClientRect()
    const position = reactFlowInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top })
    editorRef.current.pushSnapshot()
    useSimulationStore.getState().addNode(nodeType, position)
  }, [reactFlowInstance])

  const onNodeClick = useCallback((_e: React.MouseEvent, node: { id: string }) => { selectNode(node.id); setSelectedNodeIds([node.id]); setSelectedEdgeIds([]) }, [selectNode, setSelectedNodeIds, setSelectedEdgeIds])
  const onPaneClick = useCallback(() => { selectNode(null); setSelectedNodeIds([]); setSelectedEdgeIds([]) }, [selectNode, setSelectedNodeIds, setSelectedEdgeIds])
  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: { id: string }) => { selectNode(null); setSelectedNodeIds([]); setSelectedEdgeIds([edge.id]) }, [selectNode, setSelectedNodeIds, setSelectedEdgeIds])

  return {
    onNodeDragStart,
    onNodeDragStop,
    onNodesChange,
    onEdgesChange,
    handleConnect,
    onDragOver,
    onDrop,
    onNodeClick,
    onPaneClick,
    onEdgeClick,
    isValidConnection,
    nodeTypes,
    edgeTypes,
  }
}