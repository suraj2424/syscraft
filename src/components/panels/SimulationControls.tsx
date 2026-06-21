"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useEditorActions } from "@/hooks/useEditorActions";
import { Play, Pause, Square, Zap, Activity, RotateCcw, Undo2, Redo2, Download, Upload } from "lucide-react";

type ActionVariant = "neutral" | "success" | "danger" | "amber" | "red";

function ActionBtn({
  onClick,
  disabled,
  icon,
  label,
  variant = "neutral",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: ActionVariant;
}) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal transition-colors border";
  const disabledBase =
    "opacity-40 cursor-not-allowed pointer-events-none";

  const variants: Record<ActionVariant, string> = {
    neutral:
      `${base} bg-canvas text-body-mid border-white/25 hover:bg-canvas-soft hover:text-ink`,
    success:
      `${base} bg-ink text-canvas border-ink`,
    danger:
      `${base} bg-canvas text-red-400 border-white/25 hover:bg-red-500/10`,
    amber:
      `${base} bg-canvas text-amber-400 border-white/25 hover:bg-amber-500/10`,
    red:
      `${base} bg-canvas text-red-400 border-white/25 hover:bg-red-500/10`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={disabled ? `${variants[variant]} ${disabledBase}` : variants[variant]}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SimulationControls() {
  const isRunning = useSimulationStore((s) => s.simulation.isRunning);
  const speed = useSimulationStore((s) => s.simulation.speed);
  const tickCount = useSimulationStore((s) => s.simulation.tickCount);
  const globalTime = useSimulationStore((s) => s.simulation.globalTime);
  const nodeCount = useSimulationStore((s) => s.nodes.length);
  const packets = useSimulationStore((s) => s.packets);
  const playSimulation = useSimulationStore((s) => s.playSimulation);
  const pauseSimulation = useSimulationStore((s) => s.pauseSimulation);
  const stopSimulation = useSimulationStore((s) => s.stopSimulation);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const spawnTrafficSpike = useSimulationStore((s) => s.spawnTrafficSpike);
  const clearScenario = useSimulationStore((s) => s.clearScenario);
  const editor = useEditorActions();
  const nodes = useSimulationStore((s) => s.nodes);
  const edges = useSimulationStore((s) => s.edges);

  const exportArchitecture = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syscraft-architecture-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    useSimulationStore.getState().addLog("📤 Exported architecture configuration");
  };

  const importArchitecture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          alert("Invalid architecture file. Must contain 'nodes' and 'edges' arrays.");
          return;
        }
        useSimulationStore.setState({
          nodes: parsed.nodes,
          edges: parsed.edges,
          selectedNodeId: null,
          selectedNodeIds: [],
          selectedEdgeIds: [],
          packets: [],
        });
        useSimulationStore.getState().addLog(`📥 Imported architecture from ${file.name}`);
      } catch (err) {
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const activePackets = useMemo(
    () => packets.filter((p) => p.status !== "success" && p.status !== "error" && p.status !== "timeout").length,
    [packets],
  );

  const failedPackets = useMemo(
    () => packets.filter((p) => p.status === "error" || p.status === "timeout").length,
    [packets],
  );

  const successPackets = useMemo(
    () => packets.filter((p) => p.status === "success").length,
    [packets],
  );

  return (
    <div className="w-full px-3 py-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <ActionBtn
          onClick={isRunning ? pauseSimulation : playSimulation}
          icon={isRunning ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          label={isRunning ? "Pause" : "Play"}
          variant={isRunning ? "amber" : "success"}
        />

        <ActionBtn
          onClick={stopSimulation}
          icon={<Square className="h-3.5 w-3.5" />}
          label="Stop"
          variant="neutral"
        />

        {nodeCount > 0 && (
          <ActionBtn
            onClick={clearScenario}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            label="Clear"
            variant="neutral"
          />
        )}

        <div className="h-5 w-px bg-hairline mx-0.5" />

        <button
          onClick={editor.undo}
          disabled={!editor.canUndo}
          title="Undo (Ctrl+Z)"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-canvas text-body-mid border border-white/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none hover:bg-canvas-soft hover:text-ink"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={editor.redo}
          disabled={!editor.canRedo}
          title="Redo (Ctrl+Y)"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-canvas text-body-mid border border-white/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none hover:bg-canvas-soft hover:text-ink"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-px bg-hairline mx-0.5" />

        <ActionBtn
          onClick={() => spawnTrafficSpike(5)}
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Spike 5×"
          variant="red"
        />

        <div className="h-5 w-px bg-hairline mx-0.5" />

        <ActionBtn
          onClick={exportArchitecture}
          icon={<Download className="h-3.5 w-3.5" />}
          label="Export JSON"
          variant="neutral"
        />

        <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal transition-colors border bg-canvas text-body-mid border-white/25 hover:bg-canvas-soft hover:text-ink cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          <span>Import JSON</span>
          <input
            type="file"
            accept=".json"
            onChange={importArchitecture}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex items-center gap-2 text-[10px] flex-wrap">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-canvas-soft rounded-full border border-hairline">
          <Activity
            className={`h-3 w-3 ${
              isRunning ? "text-ink animate-pulse" : "text-body-mid"
            }`}
          />
          <span className={isRunning ? "text-ink" : "text-body-mid"}>
            {isRunning ? "Running" : "Paused"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] text-body-mid uppercase tracking-[1.2px]">
            Speed
          </span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s as 1 | 2 | 5)}
                className={`h-7 px-2 rounded-full text-xs font-normal transition-colors ${
                  speed === s
                    ? "bg-ink text-canvas border border-ink"
                    : "bg-canvas text-body-mid border border-white/25 hover:bg-canvas-soft hover:text-ink"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="px-2 py-1 bg-canvas-soft rounded-full border border-hairline text-body font-mono">
          Tick: {tickCount}
        </div>
        <div className="px-2 py-1 bg-canvas-soft rounded-full border border-hairline text-body font-mono">
          Time: {Math.floor(globalTime / 1000)}s
        </div>
        <div className="px-2 py-1 bg-canvas-soft rounded-full border border-hairline text-body font-mono">
          Nodes: {nodeCount}
        </div>
        <div className="px-2 py-1 bg-canvas-soft rounded-full border border-hairline text-body font-mono">
          Packets: {activePackets}
        </div>
        <div className="px-2 py-1 bg-canvas-soft rounded-full border border-hairline text-ink font-mono">
          OK: {successPackets}
        </div>
        <div className="px-2 py-1 bg-canvas-soft rounded-full border border-hairline text-red-400 font-mono">
          Fail: {failedPackets}
        </div>
      </div>
    </div>
  );
}
