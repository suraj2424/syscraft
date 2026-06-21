import React from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label className="text-[11px] font-mono uppercase tracking-[1.4px] text-body-mid min-w-[88px]">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full px-3 py-2 bg-canvas-soft border border-hairline rounded-sm text-ink text-sm font-normal focus:outline-none focus:border-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    />
  );
}

export function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-canvas-soft border border-hairline rounded-sm text-ink text-sm font-normal focus:outline-none focus:border-white/30 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ToggleInput({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex items-center h-5 w-9 rounded-full border transition-colors ${
        value ? "border-ink/40 bg-canvas-soft" : "border-hairline bg-canvas-soft"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-ink transition-transform duration-150 ${
          value ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function MetricBar({
  label,
  value,
  max,
  unit,
  color = "#7d8187",
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="py-1">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-body-mid font-mono uppercase tracking-[1.2px]">{label}</span>
        <span className="text-body font-mono">
          {value}
          {unit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-hairline rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-100"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
