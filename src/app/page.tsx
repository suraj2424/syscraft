"use client"

import { SystemCanvas } from "@/components/canvas/SystemCanvas"
import { ComponentPalette } from "@/components/panels/ComponentPalette"
import { SimulationControls } from "@/components/panels/SimulationControls"
import { LogPanel } from "@/components/panels/LogPanel"
import { HealthFeedbackPanel } from "@/components/panels/HealthFeedbackPanel"
import { ConfigPanel } from "@/components/panels/ConfigPanel"
import { SlaPanel } from "@/components/panels/SlaPanel"

export default function Page() {
  return (
    <div className="h-screen flex flex-col bg-canvas text-ink">
      <header className="flex-shrink-0 bg-canvas border-b border-hairline px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-normal text-ink tracking-tight">
            SysCraft
            <span className="font-mono text-[10px] uppercase tracking-[1.4px] text-body-mid ml-3">System Design Simulator</span>
          </h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 flex-shrink-0 bg-canvas border-r border-hairline overflow-y-auto">
          <ComponentPalette />
        </aside>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 relative">
            <SystemCanvas />
          </div>
          <div className="flex-shrink-0 border-t border-hairline">
            <SimulationControls />
          </div>
        </main>
        <aside className="w-80 flex-shrink-0 bg-canvas border-l border-hairline flex flex-col h-full">
          <HealthFeedbackPanel />
          <SlaPanel />
          <ConfigPanel />
          <LogPanel />
        </aside>
      </div>
    </div>
  )
}