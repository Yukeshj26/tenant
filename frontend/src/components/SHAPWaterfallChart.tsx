"use client";
// SHAPWaterfallChart — Recharts bar chart for SHAP feature importance

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

interface SHAPWaterfallChartProps {
  shapValues: Record<string, number>;
  maxFeatures?: number;
}

export default function SHAPWaterfallChart({ shapValues, maxFeatures = 10 }: SHAPWaterfallChartProps) {
  const entries = Object.entries(shapValues)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, maxFeatures)
    .map(([feature, value]) => ({ feature, value: Number(value.toFixed(4)) }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { feature, value } = payload[0].payload;
    const isPositive = value > 0;
    return (
      <div style={{
        background: "hsl(222,40%,12%)",
        border: "1px solid hsl(222,30%,22%)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: "0.8rem",
      }}>
        <div style={{ color: "hsl(210,40%,96%)", fontWeight: 600, marginBottom: 4 }}>{feature}</div>
        <div style={{ color: isPositive ? "hsl(0,85%,65%)" : "hsl(142,70%,50%)" }}>
          Impact: {value > 0 ? "+" : ""}{value}
        </div>
        <div style={{ color: "hsl(215,20%,55%)", fontSize: "0.72rem", marginTop: 2 }}>
          {isPositive ? "↑ Increases non-renewal risk" : "↓ Reduces non-renewal risk"}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={entries}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(222,30%,20%)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(222,30%,22%)" }}
          />
          <YAxis
            type="category"
            dataKey="feature"
            width={160}
            tick={{ fill: "hsl(210,40%,80%)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(222,35%,18%)" }} />
          <ReferenceLine x={0} stroke="hsl(222,30%,30%)" strokeWidth={1} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {entries.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.value > 0 ? "hsl(0,85%,60%)" : "hsl(142,70%,50%)"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontSize: "0.72rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "hsl(215,20%,55%)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "hsl(0,85%,60%)", display: "inline-block" }} />
          Increases risk
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "hsl(215,20%,55%)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "hsl(142,70%,50%)", display: "inline-block" }} />
          Reduces risk
        </span>
      </div>
    </div>
  );
}
