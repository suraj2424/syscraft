"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { Shield, Play, Square, CheckCircle, AlertTriangle, Activity } from "lucide-react";
import { Field, NumberInput } from "./ConfigFields";

export function SlaPanel() {
  const nodes = useSimulationStore((s) => s.nodes);
  const edges = useSimulationStore((s) => s.edges);
  const packets = useSimulationStore((s) => s.packets);
  const isRunning = useSimulationStore((s) => s.simulation.isRunning);
  const playSimulation = useSimulationStore((s) => s.playSimulation);
  const pauseSimulation = useSimulationStore((s) => s.pauseSimulation);
  const stopSimulation = useSimulationStore((s) => s.stopSimulation);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const addLog = useSimulationStore((s) => s.addLog);

  const activePanel = useSimulationStore((s) => s.activePanel);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);
  const collapsed = activePanel !== "sla";

  // SLA Targets
  const [targetLatency, setTargetLatency] = useState(150);
  const [targetErrorRate, setTargetErrorRate] = useState(2); // in %

  // Load Test State
  const [testState, setTestState] = useState<"idle" | "running" | "finished">("idle");
  const [profile, setProfile] = useState<"steady" | "ramp-up" | "spiky">("steady");
  const [testDurationSec, setTestDurationSec] = useState(15);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [originalRpsMap, setOriginalRpsMap] = useState<Record<string, number>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute current metrics originating from clients
  const clientNodes = useMemo(() => nodes.filter((n) => n.data.nodeType === "client"), [nodes]);
  
  const currentMetrics = useMemo(() => {
    let totalSent = 0;
    let totalFailed = 0;
    let totalLatencySum = 0;
    let successCount = 0;

    for (const c of clientNodes) {
      const cm = c.data.metrics as any;
      totalSent += cm.totalSent ?? 0;
      totalFailed += cm.failedRequests ?? 0;

      // Fetch completed success packets for latency
      const clientSuccess = packets.filter((p) => p.sourceNodeId === c.id && p.status === "success");
      successCount += clientSuccess.length;
      totalLatencySum += clientSuccess.reduce((acc, p) => acc + p.latencyAccMs, 0);
    }

    const avgLatency = successCount > 0 ? Math.round(totalLatencySum / successCount) : 0;
    const errorRate = totalSent > 0 ? parseFloat(((totalFailed / totalSent) * 100).toFixed(1)) : 0;

    return { avgLatency, errorRate, totalSent };
  }, [clientNodes, packets]);

  // SLA Compliance check
  const latencyPassed = currentMetrics.totalSent === 0 || currentMetrics.avgLatency <= targetLatency;
  const errorRatePassed = currentMetrics.totalSent === 0 || currentMetrics.errorRate <= targetErrorRate;
  const slaPassed = latencyPassed && errorRatePassed;

  // Handle Load Test ticking
  useEffect(() => {
    if (testState !== "running") return;

    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        
        // Dynamic traffic adjustments based on profile
        if (next < testDurationSec) {
          useSimulationStore.setState((state) => ({
            nodes: state.nodes.map((node) => {
              if (node.data.nodeType !== "client") return node;
              const origRps = originalRpsMap[node.id] ?? 100;
              let currentRps = origRps;

              if (profile === "ramp-up") {
                // Linear ramp up to 4x rps
                const ratio = next / testDurationSec;
                currentRps = Math.round(origRps + origRps * 3 * ratio);
              } else if (profile === "spiky") {
                // Sine wave oscillation between 1x and 5x rps
                const multiplier = 1 + 2 * (1 + Math.sin((next * Math.PI) / 3));
                currentRps = Math.round(origRps * multiplier);
              } else {
                // Steady at 2x rps
                currentRps = origRps * 2;
              }

              return {
                ...node,
                data: {
                  ...node.data,
                  config: { ...node.data.config, rps: currentRps },
                },
              };
            }),
          }));
        }

        if (next >= testDurationSec) {
          clearInterval(timerRef.current!);
          endLoadTest();
          return testDurationSec;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testState, originalRpsMap, profile, testDurationSec]);

  const startLoadTest = () => {
    if (clientNodes.length === 0) {
      alert("No Client nodes found to generate load.");
      return;
    }

    stopSimulation();
    
    // Save original Client RPS configurations
    const rpsMap: Record<string, number> = {};
    clientNodes.forEach((node) => {
      rpsMap[node.id] = (node.data.config as any).rps;
    });
    setOriginalRpsMap(rpsMap);
    setElapsedSec(0);
    setTestState("running");

    addLog(`🚀 SLA Load Test started [Profile: ${profile.toUpperCase()}, Duration: ${testDurationSec}s]`);
    
    // Play simulation at 5x speed for rapid results
    playSimulation();
    setSpeed(5);
  };

  const endLoadTest = () => {
    pauseSimulation();
    setTestState("finished");

    // Restore original client RPS configurations
    useSimulationStore.setState((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.data.nodeType !== "client") return node;
        const origRps = originalRpsMap[node.id] ?? 100;
        return {
          ...node,
          data: {
            ...node.data,
            config: { ...node.data.config, rps: origRps },
          },
        };
      }),
    }));

    addLog(`🏁 SLA Load Test finished. Report ready.`);
  };

  const cancelLoadTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    pauseSimulation();
    setTestState("idle");
    setElapsedSec(0);

    // Restore original client RPS configurations
    useSimulationStore.setState((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.data.nodeType !== "client") return node;
        const origRps = originalRpsMap[node.id] ?? 100;
        return {
          ...node,
          data: {
            ...node.data,
            config: { ...node.data.config, rps: origRps },
          },
        };
      }),
    }));

    addLog("🛑 SLA Load Test cancelled.");
  };

  const header = (
    <div
      onClick={() => setActivePanel(activePanel === "sla" ? null : "sla")}
      className="flex items-center gap-2 px-4 py-3 border-b border-hairline cursor-pointer hover:bg-canvas-soft/50 transition-colors"
    >
      <Shield className="h-4 w-4 text-body-mid" />
      <span className="font-mono text-[11px] font-normal uppercase tracking-[1.4px] text-body-mid">
        SLA & Load Testing
      </span>
      {testState === "running" && (
        <span className="ml-auto text-[9px] text-[#ff7a17] font-mono animate-pulse">
          TESTING: {elapsedSec}s / {testDurationSec}s
        </span>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col bg-canvas border-t border-hairline relative transition-[flex] duration-300 ease-in-out ${collapsed ? '' : 'flex-1'}`} style={{ minHeight: 0 }}>
      {header}
      {!collapsed && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent">
          {/* SLA Configuration */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-4 space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-body-mid" />
              <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid">SLA Targets</span>
            </div>
            <Field label="Max Latency ms">
              <NumberInput value={targetLatency} onChange={(v) => setTargetLatency(v)} min={1} max={10000} />
            </Field>
            <Field label="Max Failure %">
              <NumberInput value={targetErrorRate} onChange={(v) => setTargetErrorRate(v)} min={0} max={100} step={0.5} />
            </Field>
          </div>

          {/* Current SLA Status */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-body-mid" />
                <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid">Compliance</span>
              </div>
              {currentMetrics.totalSent > 0 ? (
                slaPassed ? (
                  <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full border border-[#10b981]/30">PASSED</span>
                ) : (
                  <span className="text-[10px] font-mono text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full border border-[#ef4444]/30">VIOLATED</span>
                )
              ) : (
                <span className="text-[10px] font-mono text-body-mid bg-canvas px-2 py-0.5 rounded-full border border-hairline">INACTIVE</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 border border-hairline bg-canvas/30 rounded-sm">
                <span className="text-[9px] font-mono text-body-mid uppercase tracking-[1.2px]">Avg Latency</span>
                <div className={`text-base font-normal ${latencyPassed ? "text-ink" : "text-[#ff7a17]"}`}>
                  {currentMetrics.avgLatency}ms
                  <span className="text-[10px] text-body-mid ml-1">/ {targetLatency}ms</span>
                </div>
              </div>
              <div className="p-2 border border-hairline bg-canvas/30 rounded-sm">
                <span className="text-[9px] font-mono text-body-mid uppercase tracking-[1.2px]">Failure Rate</span>
                <div className={`text-base font-normal ${errorRatePassed ? "text-ink" : "text-[#ef4444]"}`}>
                  {currentMetrics.errorRate}%
                  <span className="text-[10px] text-body-mid ml-1">/ {targetErrorRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Load Test Suite */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-4 space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Play className="h-3 w-3 text-body-mid" />
              <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid">Load Testing</span>
            </div>

            <div className="flex gap-1">
              {(["steady", "ramp-up", "spiky"] as const).map((p) => (
                <button
                  key={p}
                  disabled={testState === "running"}
                  onClick={() => setProfile(p)}
                  className={`flex-1 text-[10px] py-1 font-mono uppercase tracking-[1.1px] rounded-full border transition-colors ${
                    profile === p
                      ? "bg-ink text-canvas border-ink"
                      : "bg-canvas text-body-mid border-white/25 hover:bg-canvas-soft hover:text-ink disabled:opacity-30"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <Field label="Duration (s)">
              <NumberInput
                value={testDurationSec}
                onChange={(v) => setTestDurationSec(v)}
                min={5}
                max={120}
                disabled={testState === "running"}
              />
            </Field>

            <div className="pt-2">
              {testState === "running" ? (
                <button
                  onClick={cancelLoadTest}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#ef4444]/15 border border-[#ef4444]/40 hover:bg-[#ef4444]/25 text-[#ef4444] rounded-full text-xs font-normal transition-colors"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>Cancel Load Test</span>
                </button>
              ) : (
                <button
                  onClick={startLoadTest}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-ink text-canvas hover:bg-white/90 border border-ink rounded-full text-xs font-normal transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Start Load Test</span>
                </button>
              )}
            </div>
          </div>

          {/* Finished Report */}
          {testState === "finished" && (
            <div className="bg-canvas-card border border-hairline rounded-sm p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                {slaPassed ? (
                  <CheckCircle className="h-4 w-4 text-[#10b981]" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
                )}
                <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body">Load Test Report</span>
              </div>
              <p className="text-xs text-body-mid">
                SLA targets were {slaPassed ? "successfully met" : "violated"} under {profile} load test profile.
              </p>
              <div className="text-[10px] font-mono text-[#fafaf7]/85 bg-canvas p-2.5 rounded-sm border border-hairline space-y-1">
                <div>PROFILE: {profile.toUpperCase()}</div>
                <div>DURATION: {testDurationSec}s</div>
                <div>TOTAL TRAFFIC: {currentMetrics.totalSent} requests</div>
                <div className={latencyPassed ? "text-[#10b981]" : "text-[#ff7a17]"}>
                  LATENCY: {currentMetrics.avgLatency}ms (SLA target: {targetLatency}ms)
                </div>
                <div className={errorRatePassed ? "text-[#10b981]" : "text-[#ef4444]"}>
                  ERRORS: {currentMetrics.errorRate}% (SLA target: {targetErrorRate}%)
                </div>
              </div>
              <button
                onClick={() => setTestState("idle")}
                className="w-full text-center text-[10px] font-mono uppercase tracking-[1.1px] text-body-mid border border-white/20 py-1 rounded-full hover:bg-canvas-soft hover:text-ink transition-colors"
              >
                Clear Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
