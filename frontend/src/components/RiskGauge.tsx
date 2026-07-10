"use client";
// RiskGauge — Animated SVG gauge for churn risk score

interface RiskGaugeProps {
  score: number; // 0–100
  size?: number;
}

export default function RiskGauge({ score, size = 160 }: RiskGaugeProps) {
  const radius = 54;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius; // half circle
  const dashOffset = circumference - (score / 100) * circumference;

  const color =
    score >= 70 ? "hsl(0,85%,60%)" :
    score >= 40 ? "hsl(38,95%,58%)" :
                  "hsl(142,70%,50%)";

  const label =
    score >= 70 ? "HIGH" :
    score >= 40 ? "MEDIUM" : "LOW";

  return (
    <div style={{ position: "relative", width: size, height: size / 1.6, userSelect: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        {/* Track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="hsl(222,35%,18%)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease",
            filter: `drop-shadow(0 0 8px ${color}88)`,
          }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 6} textAnchor="middle"
          fill="hsl(210,40%,96%)" fontSize={size * 0.18} fontWeight="700"
          fontFamily="var(--font-outfit, 'Outfit', sans-serif)">
          {score}%
        </text>
        {/* Label */}
        <text x={cx} y={cy + 14} textAnchor="middle"
          fill={color} fontSize={size * 0.08} fontWeight="700" letterSpacing="0.1em">
          {label} RISK
        </text>
      </svg>
    </div>
  );
}
