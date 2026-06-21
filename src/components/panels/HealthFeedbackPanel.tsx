"use client";

import React, { useMemo } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Download, Bug, Activity } from "lucide-react";
import { analyzeHealth } from "@/model/healthAnalyzer";
import { CriticalIssuesList, WarningIssuesList, InfoIssuesList, getCategoryIcon } from "./HealthIssuesLists";
import { generateReport, exportIssuesMarkdown, autoFixCommonIssues } from "@/utils/healthReport";

export function HealthFeedbackPanel() {
  const nodes = useSimulationStore((s) => s.nodes);
  const edges = useSimulationStore((s) => s.edges);
  const packets = useSimulationStore((s) => s.packets);
  const isRunning = useSimulationStore((s) => s.simulation.isRunning);
  const tickCount = useSimulationStore((s) => s.simulation.tickCount);
  const activePanel = useSimulationStore((s) => s.activePanel);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);
  const addLog = useSimulationStore((s) => s.addLog);
  const collapsed = activePanel !== "health";

  const healthIssues = useMemo(() => {
    return analyzeHealth(nodes, edges, packets, isRunning, tickCount);
  }, [nodes, edges, packets, isRunning, tickCount]);

  const criticalIssues = useMemo(() => healthIssues.filter((i) => i.severity === "critical"), [healthIssues]);
  const warningIssues = useMemo(() => healthIssues.filter((i) => i.severity === "warning"), [healthIssues]);
  const infoIssues = useMemo(() => healthIssues.filter((i) => i.severity === "info"), [healthIssues]);

  const header = (
    <div
      onClick={() => setActivePanel(activePanel === "health" ? null : "health")}
      className="flex items-center gap-2 px-4 py-3 border-b border-hairline cursor-pointer hover:bg-canvas-soft/50 transition-colors"
    >
      <ShieldAlert className="h-4 w-4 text-body-mid" />
      <span className="text-[11px] font-normal uppercase tracking-[1.4px] text-body-mid">
        System Health & Feedback
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); autoFixCommonIssues(healthIssues, addLog); }}
          className="p-1.5 rounded-full border border-hairline hover:border-white/30 transition-colors"
          title="Get Diagnostics"
        >
          <Activity className="h-3.5 w-3.5 text-body-mid" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); generateReport(nodes, edges, packets, isRunning, tickCount, healthIssues); }}
          className="p-1.5 rounded-full border border-hairline hover:border-white/30 transition-colors"
          title="Export JSON Report"
        >
          <Download className="h-3.5 w-3.5 text-body-mid" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); exportIssuesMarkdown(nodes, edges, packets, healthIssues, criticalIssues, warningIssues); }}
          className="p-1.5 rounded-full border border-hairline hover:border-white/30 transition-colors"
          title="Export Issues (Markdown)"
        >
          <Bug className="h-3.5 w-3.5 text-body-mid" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col bg-canvas border-t border-hairline relative transition-[flex] duration-300 ease-in-out ${collapsed ? '' : 'flex-1'}`} style={{ minHeight: 0 }}>
      {header}
      {!collapsed && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent">
              {healthIssues.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center bg-canvas-card border border-hairline rounded-sm p-8">
                  <CheckCircle2 className="h-12 w-12 text-[#10b981] mb-3" />
                  <p className="text-sm text-ink font-medium">System is healthy</p>
                  <p className="text-xs text-body-mid mt-1 font-mono uppercase tracking-[1.2px]">
                    No issues detected. Your architecture is well-configured.
                  </p>
                </div>
              )}

              <CriticalIssuesList issues={criticalIssues} />
              <WarningIssuesList issues={warningIssues} />
              <InfoIssuesList issues={infoIssues} />
            </div>

            <div className="flex-shrink-0 px-4 py-3 border-t border-hairline bg-canvas-soft">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[1.2px] text-body-mid">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-3 w-3 text-[#ff7a17]" />
                    <span className="text-[#ff7a17]">{criticalIssues.length}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-[#7c3aed]" />
                    <span className="text-[#7c3aed]">{warningIssues.length}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-[#a0c3ec]" />
                    <span className="text-[#a0c3ec]">{infoIssues.length}</span>
                  </span>
                </div>
                <span className="text-[10px]">
                  {healthIssues.length === 0 ? "Healthy" : `${criticalIssues.length} critical, ${warningIssues.length} warnings`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}