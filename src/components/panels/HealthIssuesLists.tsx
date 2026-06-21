import React from "react";
import { AlertTriangle, XCircle, ShieldAlert, Database, Server, Activity } from "lucide-react";

export interface HealthIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  recommendation: string;
  affectedNodes?: string[];
}

export function getCategoryIcon(category: string) {
  switch (category) {
    case "Architecture":
    case "Reliability":
    case "Capacity":
      return <Server className="h-3 w-3 text-[#a0c3ec]" />;
    case "Database":
    case "Cache Efficiency":
      return <Database className="h-3 w-3 text-[#c4b5fd]" />;
    case "Message Queue":
      return <Server className="h-3 w-3 text-[#ffc285]" />;
    case "API Gateway":
      return <Server className="h-3 w-3 text-[#a0c3ec]" />;
    default:
      return <ShieldAlert className="h-3 w-3 text-body-mid" />;
  }
}

export function CriticalIssuesList({ issues }: { issues: HealthIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[#ff7a17] text-[11px] font-mono uppercase tracking-[1.4px]">
        <XCircle className="h-4 w-4" />
        <span>Critical ({issues.length})</span>
      </div>
      {issues.map((issue, idx) => (
        <div key={idx} className="p-4 rounded-sm border border-[#ff7a17]/30 bg-canvas-card space-y-2">
          <div className="flex items-start gap-2">
            {getCategoryIcon(issue.category)}
            <div className="flex-1">
              <p className="text-[11px] text-[#ff7a17] font-mono uppercase tracking-[1.2px]">{issue.category}</p>
              <p className="text-sm text-ink mt-1">{issue.message}</p>
              <p className="text-[11px] text-[#ffc285]/80 mt-2 p-2 bg-[#ff7a17]/10 rounded-sm border border-[#ff7a17]/20">
                <span className="font-normal">Fix:</span> {issue.recommendation}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WarningIssuesList({ issues }: { issues: HealthIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[#7c3aed] text-[11px] font-mono uppercase tracking-[1.4px]">
        <AlertTriangle className="h-4 w-4" />
        <span>Warnings ({issues.length})</span>
      </div>
      {issues.map((issue, idx) => (
        <div key={idx} className="p-4 rounded-sm border border-[#7c3aed]/30 bg-canvas-card space-y-2">
          <div className="flex items-start gap-2">
            {getCategoryIcon(issue.category)}
            <div className="flex-1">
              <p className="text-[11px] text-[#7c3aed] font-mono uppercase tracking-[1.2px]">{issue.category}</p>
              <p className="text-sm text-ink mt-1">{issue.message}</p>
              <p className="text-[11px] text-[#c4b5fd]/80 mt-2 p-2 bg-[#7c3aed]/10 rounded-sm border border-[#7c3aed]/20">
                <span className="font-normal">Action:</span> {issue.recommendation}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InfoIssuesList({ issues }: { issues: HealthIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[#a0c3ec] text-[11px] font-mono uppercase tracking-[1.4px]">
        <Activity className="h-4 w-4" />
        <span>Info ({issues.length})</span>
      </div>
      {issues.map((issue, idx) => (
        <div key={idx} className="p-4 rounded-sm border border-[#a0c3ec]/30 bg-canvas-card space-y-2">
          <div className="flex items-start gap-2">
            {getCategoryIcon(issue.category)}
            <div className="flex-1">
              <p className="text-[11px] text-[#a0c3ec] font-mono uppercase tracking-[1.2px]">{issue.category}</p>
              <p className="text-sm text-ink mt-1">{issue.message}</p>
              <p className="text-[11px] text-[#a0c3ec]/80 mt-2 p-2 bg-[#a0c3ec]/10 rounded-sm border border-[#a0c3ec]/20">
                <span className="font-normal">Tip:</span> {issue.recommendation}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
