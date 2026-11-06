"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fmtCompact, fmtDate, fmtMoney } from "@/lib/format";

// Server components can't pass functions to this client component, so formats are named.
export type Unit = "int" | "compact" | "pct" | "usd";
const FORMAT: Record<Unit, (n: number) => string> = {
  int: (n) => String(Math.round(n)),
  compact: (n) => fmtCompact(n),
  pct: (n) => `${n.toFixed(2)}%`,
  usd: (n) => fmtMoney(n),
};

export interface Series {
  name: string;
  color: string;
  points: { x: string; y: number }[];
}

const H = 220;
/** Axis text is a fixed size in pixels: the SVG is drawn at its real width, so type never scales with the window. */
const FONT = 11;
const CHAR_W = 6.6; // generous average advance for the tabular digits and symbols in tick labels
const M = { t: 12, r: 16, b: 26 };

/** Multi-series line chart over ISO dates (shared x axis), with a hover readout and a table fallback for screen readers. */
export function LineChart({ series, unit = "int", label, height = H, area = false }: { series: Series[]; unit?: Unit; label: string; height?: number; area?: boolean }) {
  const format = FORMAT[unit];
  const [hover, setHover] = useState<number | null>(null);
  const [W, setW] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  if (xs.length === 0) return <p className="text-sm text-brand-neutral-650">No data for this range.</p>;
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  const max = Math.max(...ys, 0) || 1;
  const niceMax = max * 1.08;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  // Room for the widest tick label, so none is ever clipped.
  const ml = Math.ceil(Math.max(...ticks.map((t) => format(t).length)) * CHAR_W) + 14;
  const iw = W - ml - M.r;
  const ih = height - M.t - M.b;
  const x = (i: number) => ml + (xs.length === 1 ? iw / 2 : (i / (xs.length - 1)) * iw);
  const y = (v: number) => M.t + ih - (v / niceMax) * ih;
  const labelIdx = [0, Math.floor((xs.length - 1) / 2), xs.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const xIndex = new Map(xs.map((v, i) => [v, i]));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - ml) / iw) * (xs.length - 1));
    setHover(Math.max(0, Math.min(xs.length - 1, i)));
  };

  const hoverX = hover === null ? null : xs[hover];
  return (
    <figure className="m-0">
      <div ref={box} className="relative">
        <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={id} className="block touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <title id={id}>{label}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ml} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#E2DFDA" strokeWidth={1} />
              <text x={ml - 8} y={y(t) + FONT / 3} textAnchor="end" fontSize={FONT} fill="#686764">{format(t)}</text>
            </g>
          ))}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={height - 7} textAnchor={i === 0 ? "start" : i === xs.length - 1 ? "end" : "middle"} fontSize={FONT} fill="#686764">{fmtDate(xs[i], { month: "short", day: "numeric" })}</text>
          ))}
          {series.map((s) => {
            const pts = s.points.map((p) => `${x(xIndex.get(p.x)!).toFixed(1)},${y(p.y).toFixed(1)}`);
            return (
              <g key={s.name}>
                {area && pts.length > 1 && <polygon points={`${pts[0].split(",")[0]},${y(0)} ${pts.join(" ")} ${pts[pts.length - 1].split(",")[0]},${y(0)}`} fill={s.color} opacity={0.1} />}
                <polyline points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} stroke="#908D89" strokeDasharray="3 3" />
              {series.map((s) => {
                const p = s.points.find((q) => q.x === hoverX);
                return p ? <circle key={s.name} cx={x(hover)} cy={y(p.y)} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} /> : null;
              })}
            </g>
          )}
        </svg>
        {hover !== null && hoverX && (
          <div className="pointer-events-none absolute top-1 rounded-lg border border-brand-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > xs.length / 2 ? "-105%" : "5%"})` }}>
            <p className="font-medium text-brand-neutral-900">{fmtDate(hoverX)}</p>
            {series.map((s) => {
              const p = s.points.find((q) => q.x === hoverX);
              return p ? <p key={s.name} className="flex items-center gap-1.5 text-brand-neutral-750"><span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />{s.name}: <span className="tabular-nums font-medium">{format(p.y)}</span></p> : null;
            })}
          </div>
        )}
      </div>
      {series.length > 1 && (
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-neutral-750">
          {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />{s.name}</span>)}
        </figcaption>
      )}
    </figure>
  );
}
