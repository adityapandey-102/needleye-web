"use client";

import { useId, useRef, useState } from "react";
import type { StaffWeeklyPoint } from "../../../lib/domain";

/**
 * Interactive, dependency-free SVG chart for the staff report's weekly
 * throughput: two area+line series (orders booked vs completed) for the
 * selected month, with a hover tooltip and guide line. Responsive via viewBox;
 * theme colours via CSS vars so it follows light/dark. Hand-rolled rather than
 * pulling in a charting library -- a couple of series over a handful of points
 * doesn't warrant the dependency.
 */
export function WeeklyThroughputChart({ weekly }: { weekly: StaffWeeklyPoint[] }) {
  const gid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 240;
  const pad = { top: 18, right: 16, bottom: 34, left: 30 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const n = weekly.length;
  const maxY = Math.max(1, ...weekly.map((w) => Math.max(w.booked, w.completed)));
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / maxY) * innerH;

  const linePath = (key: "booked" | "completed") =>
    weekly.map((w, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(w[key]).toFixed(1)}`).join(" ");
  const areaPath = (key: "booked" | "completed") => {
    if (n === 0) return "";
    const base = pad.top + innerH;
    return `${linePath(key)} L ${x(n - 1).toFixed(1)} ${base} L ${x(0).toFixed(1)} ${base} Z`;
  };

  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const vbx = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - vbx);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover(best);
  }

  if (n === 0) return <p className="text-sm text-text-muted">No activity in this month.</p>;

  const hx = hover != null ? x(hover) : 0;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[520px] touch-none select-none"
        role="img"
        aria-label="Weekly booked vs completed orders"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`c${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y labels at 0 / mid / max */}
        {[0, 0.5, 1].map((f) => {
          const gy = pad.top + innerH - f * innerH;
          return (
            <g key={f}>
              <line x1={pad.left} y1={gy} x2={W - pad.right} y2={gy} className="stroke-border-light" strokeWidth={1} />
              <text x={pad.left - 8} y={gy + 3} textAnchor="end" className="fill-text-muted text-[10px]">
                {Math.round(f * maxY)}
              </text>
            </g>
          );
        })}

        {/* x labels */}
        {weekly.map((w, i) => (
          <text key={w.weekStart} x={x(i)} y={H - 10} textAnchor="middle" className="fill-text-muted text-[10px]">
            {fmt(w.weekStart)}
          </text>
        ))}

        {/* hover guide */}
        {hover != null && (
          <line x1={hx} y1={pad.top} x2={hx} y2={pad.top + innerH} className="stroke-border" strokeWidth={1} strokeDasharray="3 3" />
        )}

        {/* areas + lines */}
        <path d={areaPath("booked")} fill={`url(#b${gid})`} />
        <path d={areaPath("completed")} fill={`url(#c${gid})`} />
        <path d={linePath("booked")} fill="none" strokeWidth={2.5} strokeLinejoin="round" style={{ stroke: "var(--color-primary)" }} />
        <path d={linePath("completed")} fill="none" strokeWidth={2.5} strokeLinejoin="round" style={{ stroke: "var(--color-success)" }} />

        {/* points (emphasised at hover) */}
        {weekly.map((w, i) => (
          <g key={w.weekStart}>
            <circle cx={x(i)} cy={y(w.booked)} r={hover === i ? 5 : 3} style={{ fill: "var(--color-primary)" }} className="transition-all" />
            <circle cx={x(i)} cy={y(w.completed)} r={hover === i ? 5 : 3} style={{ fill: "var(--color-success)" }} className="transition-all" />
          </g>
        ))}
      </svg>

      {/* tooltip */}
      {hover != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-app-sm border border-border bg-card px-2.5 py-1.5 text-xs shadow-app-md"
          style={{ left: `${(hx / W) * 100}%` }}
        >
          <div className="mb-1 font-semibold text-text-primary">Week of {fmt(weekly[hover]!.weekStart)}</div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-primary)" }} /> Booked
            <span className="ml-auto pl-3 font-semibold text-text-primary">{weekly[hover]!.booked}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-success)" }} /> Completed
            <span className="ml-auto pl-3 font-semibold text-text-primary">{weekly[hover]!.completed}</span>
          </div>
        </div>
      )}

      <div className="mt-1 flex gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-full" style={{ background: "var(--color-primary)" }} /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-full" style={{ background: "var(--color-success)" }} /> Completed
        </span>
      </div>
    </div>
  );
}
