"use client";
// Predictions page — real XGBoost model predictions — Vithara light theme

import { useEffect, useState } from "react";
import { tenantsAPI, predictionsAPI } from "@/lib/api";
import { Brain, Search, Loader2, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, BarChart3 } from "lucide-react";

interface Tenant {
  id: string; tenant_code: string; full_name: string; email: string;
  city: string; engagement_score: number; satisfaction_score: number;
}

interface PredictionResult {
  prediction_id: string;
  tenant_id: string;
  risk_score: number;
  risk_score_pct: number;
  risk_level: "low" | "medium" | "high";
  will_not_renew: boolean;
  shap_values: Record<string, number>;
  predicted_at: string;
}

const RISK_COLOR: Record<string, string> = {
  high: "#c4714a", medium: "#c4a44a", low: "#4e7a54"
};
const RISK_BG: Record<string, string> = {
  high: "rgba(196,113,74,0.07)", medium: "rgba(196,164,74,0.08)", low: "rgba(78,122,84,0.07)"
};
const RISK_BORDER: Record<string, string> = {
  high: "rgba(196,113,74,0.22)", medium: "rgba(196,164,74,0.22)", low: "rgba(78,122,84,0.22)"
};

export default function PredictionsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [predicting, setPredicting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, PredictionResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchSummary, setBatchSummary] = useState<{high:number;medium:number;low:number;processed:number}|null>(null);

  useEffect(() => {
    tenantsAPI.list({ limit: 100 })
      .then(res => { setTenants(res.data.tenants || []); setLoading(false); })
      .catch(() => { setLoadError("Could not load tenants — ensure the backend is running."); setLoading(false); });
  }, []);

  const runPrediction = async (tenantId: string) => {
    setPredicting(tenantId);
    setErrors(prev => { const n = {...prev}; delete n[tenantId]; return n; });
    try {
      const res = await predictionsAPI.predict({ tenant_id: tenantId });
      setResults(prev => ({ ...prev, [tenantId]: res.data }));
    } catch (e: any) {
      setErrors(prev => ({ ...prev, [tenantId]: e?.response?.data?.detail || "Prediction failed" }));
    } finally {
      setPredicting(null);
    }
  };

  const runBatchPrediction = async () => {
    setBatchRunning(true);
    setBatchSummary(null);
    try {
      const res = await predictionsAPI.batch();
      const batchResults = res.data.results as Array<PredictionResult & { tenant_name: string; top_risk_factors: string[] }>;
      const newResults: Record<string, PredictionResult> = {};
      for (const r of batchResults) {
        newResults[r.tenant_id] = { ...r };
      }
      setResults(prev => ({ ...prev, ...newResults }));
      setBatchSummary({ ...res.data.summary, processed: res.data.processed });
    } catch (e: any) {
      alert("Batch prediction failed: " + (e?.response?.data?.detail || "Server error"));
    } finally {
      setBatchRunning(false);
    }
  };

  const filtered = tenants.filter(t =>
    !search || t.full_name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
  );
  const doneCount = filtered.filter(t => results[t.id]).length;

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.75rem", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <div className="section-label">XGBoost Model · 96.79% Accuracy</div>
          <h1 className="page-title">Churn Predictions</h1>
          <p className="page-subtitle">{tenants.length} tenants loaded</p>
        </div>
        <button
          className="btn-primary"
          id="batch-predict-btn"
          onClick={runBatchPrediction}
          disabled={batchRunning || loading || tenants.length === 0}
        >
          {batchRunning
            ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> Running batch...</>
            : <><Brain size={15} /> Run All Predictions</>
          }
        </button>
      </div>

      {/* Load error */}
      {loadError && (
        <div style={{ background:"rgba(196,113,74,0.1)", border:"1px solid rgba(196,113,74,0.3)", borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1.25rem", fontSize:"0.85rem", color:"#c4714a" }}>
          ⚠️ {loadError}
        </div>
      )}

      {/* Batch summary */}
      {batchSummary && (
        <div className="glass-card" style={{ display:"flex", gap:"2rem", padding:"0.875rem 1.25rem", marginBottom:"1.25rem", alignItems:"center", flexWrap:"wrap", borderLeft: "3px solid #4e7a54" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.82rem" }}>
            <BarChart3 size={14} color="#888880" />
            <strong style={{ color:"#2c2c2c", fontFamily:"'Cormorant Garamond', Georgia, serif", fontSize:"1rem" }}>{batchSummary.processed}</strong>
            <span style={{ color:"#888880" }}>tenants analysed</span>
          </div>
          {(["high","medium","low"] as const).map(level => (
            <div key={level} style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.82rem" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:RISK_COLOR[level], display:"inline-block" }} />
              <span style={{ color:"#888880", textTransform:"capitalize" }}>{level}: </span>
              <strong style={{ color:RISK_COLOR[level] }}>{batchSummary[level]}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"1.25rem" }}>
        <Search size={16} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#888880" }} />
        <input
          id="prediction-search"
          className="input-field"
          style={{ paddingLeft:40 }}
          placeholder="Search tenants by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Progress bar */}
      {doneCount > 0 && filtered.length > 0 && (
        <div style={{ marginBottom:"1rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.75rem", color:"#888880", marginBottom:4 }}>
            <span>{doneCount} of {filtered.length} predicted</span>
            <span>{Math.round((doneCount / filtered.length) * 100)}%</span>
          </div>
          <div style={{ height:4, borderRadius:4, background:"rgba(122,158,126,0.15)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(doneCount / filtered.length) * 100}%`, background:"linear-gradient(90deg, #4e7a54, #7a9e7e)", transition:"width 0.4s ease", borderRadius:4 }} />
          </div>
        </div>
      )}

      {/* Tenant grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"1rem" }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card" style={{ padding:"1.25rem" }}>
                <div className="skeleton" style={{ height:18, width:160, marginBottom:8 }} />
                <div className="skeleton" style={{ height:14, width:220, marginBottom:16 }} />
                <div className="skeleton" style={{ height:36, width:"100%" }} />
              </div>
            ))
          : filtered.map(t => {
              const result = results[t.id];
              const err = errors[t.id];
              return (
                <div key={t.id} className="glass-card" style={{ padding:"1.25rem" }}>
                  {/* Tenant header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:"0.95rem", marginBottom:2, color:"#2c2c2c" }}>{t.full_name}</div>
                      <div style={{ fontSize:"0.75rem", color:"#888880" }}>{t.email} · {t.city || "—"}</div>
                    </div>
                    <span style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.06em", padding:"3px 10px", borderRadius:999, background:"rgba(122,158,126,0.1)", color:"#4e7a54", border:"1px solid rgba(122,158,126,0.2)" }}>
                      {t.tenant_code}
                    </span>
                  </div>

                  {/* Result */}
                  {result ? (
                    <div style={{ background:RISK_BG[result.risk_level], border:`1px solid ${RISK_BORDER[result.risk_level]}`, borderRadius:14, padding:"0.875rem" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {result.risk_level === "high" ? <AlertTriangle size={16} color={RISK_COLOR.high} /> :
                           result.risk_level === "medium" ? <TrendingUp size={16} color={RISK_COLOR.medium} /> :
                           <CheckCircle size={16} color={RISK_COLOR.low} />}
                          <span style={{ fontWeight:700, fontSize:"1.35rem", color:RISK_COLOR[result.risk_level], fontFamily:"'Cormorant Garamond', Georgia, serif" }}>
                            {result.risk_score_pct}%
                          </span>
                          <span style={{ fontSize:"0.75rem", color:"#888880" }}>churn risk</span>
                        </div>
                        <span className={`badge-${result.risk_level}`} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background:RISK_COLOR[result.risk_level] }} />
                          {result.risk_level.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize:"0.78rem", color:"#444444", marginBottom: Object.keys(result.shap_values || {}).length > 0 ? 8 : 0 }}>
                        {result.will_not_renew ? "⚠️ Predicted to NOT renew lease" : "✅ Likely to renew lease"}
                      </div>

                      {/* Top SHAP drivers */}
                      {Object.keys(result.shap_values || {}).length > 0 && (
                        <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(44,44,44,0.08)" }}>
                          <div style={{ fontSize:"0.65rem", color:"#888880", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>Top risk factors</div>
                          {Object.entries(result.shap_values)
                            .sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]))
                            .slice(0, 3)
                            .map(([feat, val]) => (
                              <div key={feat} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                                <span style={{ fontSize:"0.72rem", color:"#444444", flex:1 }}>{feat}</span>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <div style={{ width:50, height:4, borderRadius:4, background:"rgba(44,44,44,0.08)", overflow:"hidden" }}>
                                    <div style={{ height:"100%", width:`${Math.min(100, Math.abs(val) * 20)}%`, background: val > 0 ? RISK_COLOR.high : RISK_COLOR.low, borderRadius:4 }} />
                                  </div>
                                  <span style={{ fontSize:"0.68rem", color: val > 0 ? RISK_COLOR.high : RISK_COLOR.low, minWidth:30, textAlign:"right", fontWeight:700 }}>
                                    {val > 0 ? "+" : ""}{val.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      <button
                        className="btn-secondary"
                        onClick={() => runPrediction(t.id)}
                        disabled={predicting === t.id}
                        style={{ width:"100%", justifyContent:"center", padding:"0.45rem", marginTop:10, fontSize:"0.75rem" }}
                      >
                        {predicting === t.id ? <><Loader2 size={12} style={{ animation:"spin 1s linear infinite" }} /> Re-running...</> : <><RefreshCw size={12} /> Re-run</>}
                      </button>
                    </div>
                  ) : err ? (
                    <div style={{ background:"rgba(196,113,74,0.08)", border:"1px solid rgba(196,113,74,0.2)", borderRadius:12, padding:"0.75rem", fontSize:"0.78rem", color:"#c4714a" }}>
                      ⚠️ {err}
                      <button className="btn-secondary" onClick={() => runPrediction(t.id)} style={{ marginTop:8, width:"100%", justifyContent:"center", padding:"0.45rem", fontSize:"0.75rem" }}>
                        Retry
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-primary"
                      id={`predict-${t.id}`}
                      onClick={() => runPrediction(t.id)}
                      disabled={predicting === t.id}
                      style={{ width:"100%", justifyContent:"center", padding:"0.65rem" }}
                    >
                      {predicting === t.id
                        ? <><Loader2 size={14} style={{ animation:"spin 1s linear infinite" }} /> Analysing...</>
                        : <><Brain size={14} /> Run Prediction</>
                      }
                    </button>
                  )}
                </div>
              );
            })}
      </div>

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign:"center", padding:"3rem", color:"#888880" }}>
          {search ? `No tenants matching "${search}"` : "No tenants found. Add tenants first."}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
