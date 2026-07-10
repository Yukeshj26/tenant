"use client";
// Settings page — application configuration

import { useState } from "react";
import { Settings, Globe, Bell, Database, Shield } from "lucide-react";

export default function SettingsPage() {
  const [language, setLanguage] = useState("en");
  const [notifications, setNotifications] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState(70);

  return (
    <div className="fade-in-up">
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-outfit)" }}>Settings</h1>
        <p style={{ color: "hsl(215,20%,55%)", fontSize: "0.85rem" }}>Configure your TenantSense AI platform</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 640 }}>
        {/* Language */}
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
            <Globe size={18} color="hsl(214,100%,60%)" />
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Language</h2>
          </div>
          <label style={{ display: "block", fontSize: "0.78rem", color: "hsl(215,20%,65%)", marginBottom: 6 }}>
            Default platform language
          </label>
          <select
            id="language-select"
            className="input-field"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{ maxWidth: 280 }}
          >
            <option value="en">English</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="hi">Hindi (हिंदी)</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
            <Bell size={18} color="hsl(38,95%,58%)" />
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Notifications</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 500, marginBottom: 2 }}>Email alerts for high-risk tenants</div>
              <div style={{ fontSize: "0.75rem", color: "hsl(215,20%,55%)" }}>Receive alerts when a tenant's risk score exceeds threshold</div>
            </div>
            <button
              id="notifications-toggle"
              onClick={() => setNotifications(!notifications)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: notifications ? "hsl(214,100%,55%)" : "hsl(222,30%,25%)",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: notifications ? 23 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "white",
                transition: "left 0.2s",
              }} />
            </button>
          </div>
        </div>

        {/* Risk Threshold */}
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
            <Shield size={18} color="hsl(0,85%,60%)" />
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Risk Threshold</h2>
          </div>
          <label style={{ display: "block", fontSize: "0.78rem", color: "hsl(215,20%,65%)", marginBottom: 8 }}>
            High-risk classification threshold: <strong style={{ color: "hsl(0,85%,60%)" }}>{riskThreshold}%</strong>
          </label>
          <input
            id="risk-threshold-slider"
            type="range" min={30} max={90} value={riskThreshold}
            onChange={e => setRiskThreshold(Number(e.target.value))}
            style={{ width: "100%", accentColor: "hsl(214,100%,60%)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "hsl(215,20%,50%)", marginTop: 4 }}>
            <span>30% (Sensitive)</span>
            <span>90% (Conservative)</span>
          </div>
        </div>

        {/* Database info */}
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
            <Database size={18} color="hsl(142,70%,50%)" />
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>System Info</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              ["API Endpoint", "localhost:8000"],
              ["ML Model", "XGBoost v1.0"],
              ["AI Engine", "Gemini 2.5 Flash"],
              ["Database", "PostgreSQL + MongoDB"],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: "0.625rem 0.875rem", background: "hsl(222,35%,14%)", borderRadius: 8 }}>
                <div style={{ fontSize: "0.7rem", color: "hsl(215,20%,50%)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "hsl(210,40%,90%)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
