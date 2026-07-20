"use client";

import { useMemo } from "react";

interface DataPoint {
  [key: string]: string | number;
}

interface Series {
  key: string;
  color: string;
  name?: string;
}

interface AreaChartProps {
  data: DataPoint[];
  series: Series[];
  xKey: string;
  height?: number;
  className?: string;
}

export function AreaChart({
  data,
  series,
  xKey,
  height = 350,
  className,
}: AreaChartProps) {
  const { paths, xLabels, yTicks, seriesMeta } = useMemo(() => {
    if (!data.length || !series.length)
      return { paths: "", xLabels: [], yTicks: [], seriesMeta: [] };

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const w = 800;
    const h = height;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Compute y range
    let yMin = 0;
    let yMax = 0;
    for (const s of series) {
      for (const d of data) {
        const v = Number(d[s.key]) || 0;
        if (v > yMax) yMax = v;
      }
    }
    if (yMax === 0) yMax = 1;
    // Add 10% headroom
    yMax = yMax * 1.1;

    const xStep = chartW / Math.max(data.length - 1, 1);

    const xLabels = data.map((d, i) => ({
      label: String(d[xKey]),
      x: padding.left + i * xStep,
    }));

    // Y ticks (5 lines)
    const tickCount = 5;
    const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
      const val = yMin + ((yMax - yMin) * i) / tickCount;
      return {
        val,
        y: padding.top + chartH - (val / yMax) * chartH,
        label: val >= 1 ? `${val.toFixed(1)}M` : val.toFixed(1),
      };
    });

    const seriesMeta = series.map((s) => {
      const points = data.map((d, i) => ({
        x: padding.left + i * xStep,
        y: padding.top + chartH - ((Number(d[s.key]) || 0) / yMax) * chartH,
      }));

      // Build SVG path
      let line = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        // Smooth curve using cubic bezier
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        line += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
      }

      // Area fill (close to bottom)
      const area =
        line +
        ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

      return { line, area, color: s.color, key: s.key, name: s.name || s.key };
    });

    return { paths: "", xLabels, yTicks, seriesMeta };
  }, [data, series, xKey, height]);

  const h = height;
  const w = 800;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {seriesMeta.map((s) => (
            <linearGradient
              key={s.key}
              id={`grad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={50}
              y1={t.y}
              x2={w - 20}
              y2={t.y}
              stroke="#e5e7eb"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
            />
            <text
              x={45}
              y={t.y + 4}
              textAnchor="end"
              fontSize={11}
              fill="#888"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={h - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#888"
          >
            {xl.label}
          </text>
        ))}

        {/* Series */}
        {seriesMeta.map((s) => (
          <g key={s.key}>
            <path d={s.area} fill={`url(#grad-${s.key})`} />
            <path
              d={s.line}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
