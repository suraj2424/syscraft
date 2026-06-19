"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { ScrollText, ChevronDown, ChevronUp } from "lucide-react";

export function LogPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const logs = useSimulationStore((s) => s.simulation.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className={`${collapsed ? "flex-[0_0_44px]" : "flex-1 min-h-0"} flex flex-col overflow-hidden border-t border-hairline`}>
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-hairline">
        <ScrollText className="h-3.5 w-3.5 text-body-mid" />
        <span className="text-[11px] font-normal uppercase tracking-wider text-body-mid">
          Logs
        </span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto p-1 hover:bg-white/5 rounded transition-colors"
          title={collapsed ? "Expand log panel" : "Collapse log panel"}
        >
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-body-mid" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-body-mid" />
          )}
        </button>
      </div>
      {!collapsed && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[11px] leading-relaxed"
        >
        {logs.map((log, i) => (
          <div key={i} className="text-body-mid">
            {log}
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
