"use client";
// Analytics page — full charts: revenue forecast, vacancy, risk trend

import { useEffect, useState } from "react";
import { analyticsAPI } from "@/lib/api";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
} from "recharts";
import { TrendingDown, TrendingUp, DollarSign, Home } from "lucide-react";

export default function AnalyticsPage() {
  const [vacancy, setVacancy] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsAPI.vacancyForecast(6), analyticsAPI.revenueForecast(6)])
      .then(([v, r]) => { setVacancy(v.data.forecast); setRevenue(r.data.forecast); })
      .catch(() => {
        const months = ["Aug 2024","Sep 2024","Oct 2024","Nov 2024","Dec 2024","Jan 2025"];
        setVacancy(months.map((m, i) => ({ month: m, predicted_vacancies: 8 + i * 2, occupancy_rate: 92 - i * 2, vacancy_rate: 8 + i * 2 })));
        setRevenue(months.map((m, i) => ({ month: m, monthly_rent_loss: 200000 + i * 50000, cumulative_loss: (i + 1) * 250000, total_monthly_loss: 225000 + i * 50000 })));
      })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`;

  const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="glass-card" style={{ marginBottom: "1.25rem" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: subtitle ? 4 : "1.25rem", color: "#2c2c2c", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "0.78rem", color: "#888880", marginBottom: "1.25rem" }}>{subtitle}</p>}
      {children}
    </div>
  );

  return (
    <div className="fade-in-up">
      <div style={{ marginBottom: "1.75rem" }}>
        <div className="section-label">Vacancy &amp; Revenue</div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Vacancy and revenue forecasts for the next 6 months</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Projected Vacancies (6m)", value: vacancy.length ? `${Math.round(vacancy[5]?.predicted_vacancies || 0)} units` : "—", icon: <Home size={18} />, color: "#c4a44a" },
          { label: "Avg Occupancy Rate",       value: vacancy.length ? `${(vacancy.reduce((s, v) => s + v.occupancy_rate, 0) / vacancy.length).toFixed(1)}%` : "—", icon: <TrendingUp size={18} />, color: "#4e7a54" },
          { label: "Monthly Revenue Loss",    value: revenue.length ? fmt(revenue[revenue.length - 1]?.monthly_rent_loss || 0) : "—", icon: <DollarSign size={18} />, color: "#c4714a" },
          { label: "Cumulative Loss (6m)",    value: revenue.length ? fmt(revenue[revenue.length - 1]?.cumulative_loss || 0) : "—", icon: <TrendingDown size={18} />, color: "#c4714a" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: "0.7rem", color: "#888880", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
              <span style={{ color }}>{icon}</span>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Vacancy Forecast */}
      <ChartCard title="Vacancy & Occupancy Forecast" subtitle="Predicted vacant units and occupancy rate over 6 months">
        {loading ? <div className="skeleton" style={{ height: 280 }} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={vacancy} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,44,44,0.07)" />
              <XAxis dataKey="month" tick={{ fill: "#888880", fontSize: 11 }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: "#888880", fontSize: 11 }} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#888880", fontSize: 11 }} tickLine={false} domain={[70, 100]} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(122,158,126,0.2)", borderRadius: 12, boxShadow: "0 4px 20px rgba(44,44,44,0.08)" }} />
              <Legend formatter={v => <span style={{ color: "#888880", fontSize: "0.78rem" }}>{v}</span>} />
              <Bar yAxisId="left" dataKey="predicted_vacancies" name="Vacant Units" fill="#c4a44a" fillOpacity={0.75} radius={[4,4,0,0]} maxBarSize={28} />
              <Line yAxisId="right" type="monotone" dataKey="occupancy_rate" name="Occupancy %" stroke="#4e7a54" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Revenue Forecast */}
      <ChartCard title="Revenue Loss Forecast" subtitle="Monthly rent loss and cumulative financial impact">
        {loading ? <div className="skeleton" style={{ height: 280 }} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenue} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c4714a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c4714a" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c4a44a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#c4a44a" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,44,44,0.07)" />
              <XAxis dataKey="month" tick={{ fill: "#888880", fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: "#888880", fontSize: 11 }} tickLine={false} tickFormatter={fmt} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(122,158,126,0.2)", borderRadius: 12, boxShadow: "0 4px 20px rgba(44,44,44,0.08)" }} formatter={(v: any) => [fmt(v), ""]} />
              <Legend formatter={v => <span style={{ color: "#888880", fontSize: "0.78rem" }}>{v}</span>} />
              <Area type="monotone" dataKey="monthly_rent_loss" name="Monthly Loss"    stroke="#c4714a" strokeWidth={2} fill="url(#lossGrad)" />
              <Area type="monotone" dataKey="cumulative_loss"   name="Cumulative Loss" stroke="#c4a44a" strokeWidth={2} fill="url(#cumGrad)"  />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
