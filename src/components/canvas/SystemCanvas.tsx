"use client"

import { ReactFlowProvider, ReactFlow, Controls, MiniMap, Background, BackgroundVariant } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useSimulationStore } from "@/store/useSimulationStore"
import { useCanvasHandlers } from "@/hooks/useCanvasHandlers"

const canvasCss = `
  .react-flow__controls{border-radius:8px!important;overflow:hidden!important;border:1px solid #212327!important;box-shadow:none!important}
  .react-flow__controls button{background:#0a0a0a!important;color:#7d8187!important;border:none!important;border-right:1px solid #212327!important;width:32px!important;height:32px!important;display:flex!important;align-items:center!important;justify-content:center!important}
  .react-flow__controls button:last-child{border-right:none!important}
  .react-flow__controls button:hover{background:#1a1c20!important;color:#fff!important}
  .react-flow__controls button svg{fill:currentColor!important;width:14px!important;height:14px!important}
  .react-flow__minimap{border-radius:8px!important;overflow:hidden!important;border:1px solid #2a2d33!important;background:#0f0f10!important;box-shadow:0 2px 8px rgba(0,0,0,.3)!important}
  .react-flow__minimap svg{background:#0f0f10!important}
  .react-flow__minimap-mask{fill:rgba(255,255,255,.04)!important}
  .react-flow__minimap-node{fill:#4a4f57!important}
  .react-flow__edge-path{stroke:#212327;stroke-width:1.5;transition:stroke .15s ease}
  .react-flow__edge:hover .react-flow__edge-path{stroke:#363a3f}
  .react-flow__edge.selected .react-flow__edge-path{stroke:#fff;stroke-width:2}
  .react-flow__handle{background:#0a0a0a!important;border:1.5px solid #fff!important;border-radius:50%!important}
  .node-handle{cursor:crosshair}
  .react-flow__handle.node-handle.react-flow__handle-connecting{background:#fff!important;box-shadow:0 0 0 4px rgba(255,255,255,.2)!important}
  .react-flow__handle.valid-target{border-color:#10b981!important}
  .react-flow__handle.invalid-target{opacity:.25;border-color:#7d8187!important;cursor:not-allowed}
  .react-flow__connection-line{stroke:#7d8187!important;stroke-width:1.5!important;stroke-dasharray:4,4!important;opacity:.5}
  .react-flow__background{background:#0a0a0a}
`

function CanvasFlow() {
  const nodes = useSimulationStore((s) => s.nodes)
  const edges = useSimulationStore((s) => s.edges)
  const { nodeTypes, edgeTypes, onNodeDragStart, onNodeDragStop, onNodesChange, onEdgesChange, handleConnect, onDragOver, onDrop, onNodeClick, onEdgeClick, onPaneClick, isValidConnection } = useCanvasHandlers()

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        isValidConnection={isValidConnection}
        snapToGrid snapGrid={[10, 10]}
        minZoom={0.3} maxZoom={2} fitView={false}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        className="w-full h-full"
        proOptions={{ hideAttribution: true }}
        panOnDrag selectionOnDrag
      >
        <Controls position="top-right" showZoom showFitView showInteractive={false} />
        <MiniMap position="bottom-right" nodeColor="#363a3f" nodeStrokeWidth={0} maskColor="rgba(255,255,255,.03)" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={2} color="#2a2d33" />
      </ReactFlow>
    </div>
  )
}

export function SystemCanvas() {
  return (
    <>
      <style>{canvasCss}</style>
      <ReactFlowProvider>
        <CanvasFlow />
      </ReactFlowProvider>
    </>
  )
}