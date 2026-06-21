"use client";

import React, { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { ScrollText } from "lucide-react";

export function LogPanel() {
  const logs = useSimulationStore((s) => s.simulation.logs);
  const activePanel = useSimulationStore((s) => s.activePanel);
  const setActivePanel = useSimulationStore((s) => s.setActivePanel);
  const collapsed = activePanel !== "logs";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className={`flex flex-col border-t border-hairline bg-canvas relative transition-[flex] duration-100 ease-in-out ${collapsed ? '' : 'flex-1'}`} style={{ minHeight: 0 }}>
      <div
        onClick={() => setActivePanel(activePanel === "logs" ? null : "logs")}
        className="flex items-center gap-1.5 px-4 py-3 border-b border-hairline cursor-pointer hover:bg-canvas-soft/50 transition-colors"
      >
        <ScrollText className="h-3.5 w-3.5 text-body-mid flex-shrink-0" />
        <span className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid">
          Logs
        </span>
      </div>
      {!collapsed && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent"
          >
            {logs.map((log, i) => (
              <div key={i} className="text-body-mid py-0.5">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
