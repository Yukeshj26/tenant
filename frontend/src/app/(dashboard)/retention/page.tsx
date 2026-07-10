"use client";
// Retention strategies page — Vithara light theme

import { useEffect, useState } from "react";
import { tenantsAPI, retentionAPI } from "@/lib/api";
import { Shield, Search, Loader2, ChevronRight, Sparkles } from "lucide-react";

interface Tenant {
  id: string; tenant_code: string; full_name: string; email: string;
  city: string; engagement_score: number; satisfaction_score: number;
}
interface Strategy {
  category: string; action: string; priority: string; estimated_impact: string;
}
interface RetentionData {
  tenant_id: string; tenant_name: string; risk_level: string;
  risk_score_pct: number; strategies: Strategy[]; ai_message: string | null;
}

const RISK_COLORS: Record<string, string> = {
  high: "#c4714a", medium: "#c4a44a", low: "#4e7a54"
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#b83c36", high: "#c4714a", medium: "#c4a44a", low: "#4e7a54"
};

export default function RetentionPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    tenantsAPI.list({ limit: 50 })
      .then(res => { setTenants(res.data.tenants); setLoading(false); })
      .catch(() => {
        setTenants(Array.from({ length: 6 }, (_, i) => ({
          id: `t-${i}`, tenant_code: `T0000${i + 1}`,
          full_name: ["Priya Sharma", "Ravi Kumar", "Anita Patel", "Deepak Nair", "Sunita Reddy", "Arjun Singh"][i],
          email: `tenant${i}@example.com`, city: ["Chennai", "Mumbai"][i % 2],
          engagement_score: 0.3 + Math.random() * 0.6, satisfaction_score: 4 + Math.random() * 5,
        })));
        setLoading(false);
      });
  }, []);

  const fetchRetention = async (tenantId: string) => {
    setSelectedTenant(tenantId);
    setFetching(true);
    setRetentionData(null);
    try {
      const res = await retentionAPI.get(tenantId);
      setRetentionData(res.data);
    } catch {
      setRetentionData({
        tenant_id: tenantId,
        tenant_name: tenants.find(t => t.id === tenantId)?.full_name || "Tenant",
        risk_level: "medium",
        risk_score_pct: 52.3,
        strategies: [
          { category: "Financial", action: "Offer flexible payment plan", priority: "high", estimated_impact: "Reduces friction by ~20%" },
          { category: "Engagement", action: "Send personalized check-in message", priority: "medium", estimated_impact: "Increases engagement by 15-25%" },
        ],
        ai_message: "We truly value your tenancy and want to ensure you feel at home. Let's discuss how we can make your experience even better.",
      });
    } finally {
      setFetching(false);
    }
  };

  const filteredTenants = tenants.filter(
    t => !search || t.full_name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div className="section-label">AI-Powered</div>
        <h1 className="page-title">Retention Strategies</h1>
        <p className="page-subtitle">Personalized retention plans for at-risk tenants</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.25rem" }}>
        {/* Tenant list */}
        <div>
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#888880" }} />
            <input
              id="retention-search"
              className="input-field"
              style={{ paddingLeft: 40 }}
              placeholder="Search tenants..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="glass-card" style={{ padding: 0, maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(44,44,44,0.06)" }}>
                  <div className="skeleton" style={{ height: 16, width: 140, marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: 200 }} />
                </div>
              ))
            ) : filteredTenants.map(t => (
              <button
                key={t.id}
                id={`retention-tenant-${t.id}`}
                onClick={() => fetchRetention(t.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "0.875rem 1.25rem", border: "none", cursor: "pointer",
                  borderBottom: "1px solid rgba(44,44,44,0.06)", textAlign: "left",
                  background: selectedTenant === t.id ? "rgba(122,158,126,0.1)" : "transparent",
                  transition: "background 0.15s",
                  borderLeft: selectedTenant === t.id ? "3px solid #4e7a54" : "3px solid transparent",
                }}
                onMouseEnter={e => { if (selectedTenant !== t.id) e.currentTarget.style.background = "rgba(122,158,126,0.05)"; }}
                onMouseLeave={e => { if (selectedTenant !== t.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#2c2c2c", marginBottom: 2 }}>{t.full_name}</div>
                  <div style={{ fontSize: "0.73rem", color: "#888880" }}>{t.city} · {t.tenant_code}</div>
                </div>
                <ChevronRight size={14} style={{ color: "#888880" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Retention detail */}
        <div>
          {fetching ? (
            <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#4e7a54" }} />
            </div>
          ) : retentionData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Header card */}
              <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "#2c2c2c", marginBottom: 4, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{retentionData.tenant_name}</div>
                  <div style={{ fontSize: "0.82rem", color: "#888880" }}>Retention plan generated</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: RISK_COLORS[retentionData.risk_level], fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    {retentionData.risk_score_pct}%
                  </div>
                  <span className={`badge-${retentionData.risk_level}`}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: RISK_COLORS[retentionData.risk_level] }} />
                    {retentionData.risk_level.toUpperCase()} RISK
                  </span>
                </div>
              </div>

              {/* AI message */}
              {retentionData.ai_message && (
                <div className="glass-card" style={{ borderLeft: "3px solid #7a9e7e" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Sparkles size={16} color="#4e7a54" />
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#4e7a54", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI-Generated Message</span>
                  </div>
                  <p style={{ margin: 0, fontStyle: "italic", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1rem", color: "#444444", lineHeight: 1.7 }}>
                    &ldquo;{retentionData.ai_message}&rdquo;
                  </p>
                </div>
              )}

              {/* Strategies */}
              <div className="glass-card">
                <div className="section-label" style={{ marginBottom: "0.5rem" }}>Recommended Actions</div>
                <h3 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem", color: "#2c2c2c", fontFamily: "'Cormorant Garamond', Georgia, serif", display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={16} color="#4e7a54" />
                  Strategies ({retentionData.strategies.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {retentionData.strategies.map((s, i) => (
                    <div key={i} style={{
                      padding: "1rem 1.1rem", borderRadius: 14,
                      background: "#faf7f2",
                      border: "1px solid rgba(122,158,126,0.15)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#4e7a54", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.category}</span>
                        <span style={{
                          fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                          background: `${PRIORITY_COLORS[s.priority]}18`, color: PRIORITY_COLORS[s.priority],
                          textTransform: "uppercase", letterSpacing: "0.05em", border: `1px solid ${PRIORITY_COLORS[s.priority]}30`,
                        }}>
                          {s.priority}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.88rem", color: "#2c2c2c", margin: "0 0 6px", fontWeight: 500 }}>{s.action}</p>
                      <p style={{ fontSize: "0.76rem", color: "#888880", margin: 0 }}>📊 {s.estimated_impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#888880" }}>
              <Shield size={40} style={{ marginBottom: 12, opacity: 0.3, color: "#7a9e7e" }} />
              <p style={{ fontSize: "0.9rem" }}>Select a tenant to view retention strategies</p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
