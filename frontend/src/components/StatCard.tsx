"use client";
// StatCard — KPI summary card with Vithara Care Clinic light theme

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  icon: React.ReactNode;
  accentColor?: string;
  loading?: boolean;
}

export default function StatCard({
  id, title, value, subtitle, trend, trendValue, icon,
  accentColor = "#4e7a54",
  loading,
}: StatCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp :
    trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"   ? "#b83c36" :
    trend === "down" ? "#4e7a54" :
    "#888880";

  if (loading) {
    return (
      <div className="stat-card">
        <div className="skeleton" style={{ height: 12, width: "55%", marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 30, width: "38%", marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 10, width: "48%" }} />
      </div>
    );
  }

  return (
    <div className="stat-card fade-in-up" id={id}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.875rem" }}>
        <span style={{
          fontSize: "0.72rem", color: "#888880",
          fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          {title}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${accentColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor,
          border: `1px solid ${accentColor}25`,
        }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{
        fontSize: "2rem", fontWeight: 700,
        color: "#2c2c2c",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        lineHeight: 1.1,
        marginBottom: "0.4rem",
      }}>
        {value}
      </div>

      {/* Subtitle + trend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {subtitle && (
          <span style={{ fontSize: "0.73rem", color: "#888880" }}>{subtitle}</span>
        )}
        {trend && trendValue && (
          <span style={{
            display: "flex", alignItems: "center", gap: 3,
            fontSize: "0.73rem", color: trendColor, fontWeight: 700,
          }}>
            <TrendIcon size={12} />
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
