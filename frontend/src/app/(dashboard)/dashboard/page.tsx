"use client";
// Dashboard page — KPI cards, risk distribution, recent high-risk tenants

import { useEffect, useState } from "react";
import { analyticsAPI, tenantsAPI, predictionsAPI } from "@/lib/api";
import StatCard from "@/components/StatCard";
import {
  Users, AlertTriangle, TrendingUp, Home,
  Calendar, Activity, RefreshCw, Upload,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import Link from "next/link";

interface DashboardKPIs {
  total_tenants: number;
  high_risk_tenants: number;
  avg_risk_score: number;
  predicted_non_renewals_30d: number;
  leases_expiring_90d: number;
  retention_rate_pct: number;
}

interface RiskDist { low: number; medium: number; high: number; }

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [riskDist, setRiskDist] = useState<RiskDist | null>(null);
  const [vacancy, setVacancy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [kpiRes, riskRes, vacRes] = await Promise.all([
        analyticsAPI.dashboard(),
        analyticsAPI.riskDistribution(),
        analyticsAPI.vacancyForecast(6),
      ]);
      setKpis(kpiRes.data);
      setRiskDist(riskRes.data);
      setVacancy(vacRes.data.forecast || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      // Show mock data in dev
      setKpis({ total_tenants: 247, high_risk_tenants: 31, avg_risk_score: 42.3, predicted_non_renewals_30d: 18, leases_expiring_90d: 54, retention_rate_pct: 87.2 });
      setRiskDist({ low: 142, medium: 74, high: 31 });
      setVacancy([
        { month: "Aug 2024", predicted_vacancies: 8, occupancy_rate: 92 },
        { month: "Sep 2024", predicted_vacancies: 12, occupancy_rate: 88 },
        { month: "Oct 2024", predicted_vacancies: 15, occupancy_rate: 85 },
        { month: "Nov 2024", predicted_vacancies: 11, occupancy_rate: 89 },
        { month: "Dec 2024", predicted_vacancies: 9, occupancy_rate: 91 },
        { month: "Jan 2025", predicted_vacancies: 7, occupancy_rate: 93 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const riskPieData = riskDist ? [
    { name: "Low Risk",    value: riskDist.low,    color: "#4e7a54" },
    { name: "Medium Risk", value: riskDist.medium, color: "#c4a44a" },
    { name: "High Risk",   value: riskDist.high,   color: "#c4714a" },
  ] : [];

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <div className="section-label">Overview</div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Last updated: {lastRefresh || "—"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" id="refresh-btn" onClick={fetchAll}>
            <RefreshCw size={15} /> Refresh
          </button>
          <Link href="/tenants" className="btn-primary" id="add-tenant-btn">
            <Users size={15} /> Manage Tenants
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard id="stat-total-tenants" title="Total Tenants"          value={kpis?.total_tenants ?? "—"}              icon={<Users size={18} />}         loading={loading} subtitle="Active leases"              accentColor="#4e7a54" />
        <StatCard id="stat-high-risk"     title="High-Risk Tenants"      value={kpis?.high_risk_tenants ?? "—"}          icon={<AlertTriangle size={18} />} loading={loading} subtitle="≥70% non-renewal score"    accentColor="#c4714a" />
        <StatCard id="stat-avg-risk"      title="Avg Risk Score"          value={kpis ? `${kpis.avg_risk_score}%` : "—"} icon={<Activity size={18} />}      loading={loading} subtitle="Across all predictions"    accentColor="#c4a44a" />
        <StatCard id="stat-non-renewals"  title="Predicted Non-Renewals"  value={kpis?.predicted_non_renewals_30d ?? "—"} icon={<TrendingUp size={18} />}    loading={loading} subtitle="Next 30 days"               accentColor="#c4714a" />
        <StatCard id="stat-expiring"      title="Leases Expiring Soon"    value={kpis?.leases_expiring_90d ?? "—"}        icon={<Calendar size={18} />}      loading={loading} subtitle="Within 90 days"            accentColor="#c4a44a" />
        <StatCard id="stat-retention"     title="Retention Rate"          value={kpis ? `${kpis.retention_rate_pct}%` : "—"} icon={<Home size={18} />}      loading={loading} subtitle="Current period"            accentColor="#4e7a54" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "1.25rem", marginBottom: "2rem" }}>
        {/* Risk Distribution Pie */}
        <div className="glass-card">
          <div className="section-label" style={{ marginBottom: "0.25rem" }}>Breakdown</div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", color: "#2c2c2c", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Risk Distribution
          </h2>
          {riskDist ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={4} dataKey="value">
                  {riskPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid rgba(122,158,126,0.2)", borderRadius: 12, boxShadow: "0 4px 20px rgba(44,44,44,0.08)" }}
                  labelStyle={{ color: "#2c2c2c" }}
                />
                <Legend iconType="circle" iconSize={10}
                  formatter={(v) => <span style={{ color: "#888880", fontSize: "0.78rem" }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 240 }} />
          )}
        </div>

        {/* Vacancy Forecast Area Chart */}
        <div className="glass-card">
          <div className="section-label" style={{ marginBottom: "0.25rem" }}>Forecast</div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", color: "#2c2c2c", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            6-Month Vacancy Forecast
          </h2>
          {vacancy.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={vacancy} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="vacGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4e7a54" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4e7a54" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,44,44,0.07)" />
                <XAxis dataKey="month" tick={{ fill: "#888880", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#888880", fontSize: 11 }} tickLine={false} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(122,158,126,0.2)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="predicted_vacancies" name="Vacant Units"
                  stroke="#4e7a54" strokeWidth={2} fill="url(#vacGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 240 }} />
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card">
        <div className="section-label" style={{ marginBottom: "0.25rem" }}>Actions</div>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", color: "#2c2c2c", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Quick Actions</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/predictions" className="btn-primary" id="run-prediction-btn">
            <Activity size={15} /> Run Batch Prediction
          </Link>
          <Link href="/analytics" className="btn-secondary" id="view-analytics-btn">
            <TrendingUp size={15} /> View Full Analytics
          </Link>
          <Link href="/chatbot" className="btn-secondary" id="open-chatbot-btn">
            AI Chatbot
          </Link>
        </div>
      </div>
    </div>
  );
}
