"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { tenantsAPI, predictionsAPI, retentionAPI, leaseAgreementAPI, paymentsAPI } from "@/lib/api";
import RiskGauge from "@/components/RiskGauge";
import SHAPWaterfallChart from "@/components/SHAPWaterfallChart";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  User, Mail, Phone, MapPin, Home,
  Activity, Brain, Shield, MessageSquare,
  Upload, FileText, Download, Trash2, CheckCircle2, AlertCircle, File, CreditCard,
} from "lucide-react";

interface AgreementInfo {
  has_agreement: boolean;
  lease_id?: string;
  filename?: string;
  file_size_kb?: number;
  download_url?: string;
}

function LeaseAgreementCard({ tenantId }: { tenantId: string }) {
  const [info, setInfo] = useState<AgreementInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInfo = async () => {
    try {
      const res = await leaseAgreementAPI.getInfo(tenantId);
      setInfo(res.data);
    } catch (e: any) {
      if (e?.response?.status === 404) setInfo({ has_agreement: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInfo(); }, [tenantId]);

  const handleFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setStatusMsg({ type: "error", text: "File too large. Max size is 20 MB." });
      return;
    }
    setUploading(true);
    setStatusMsg(null);
    try {
      await leaseAgreementAPI.upload(tenantId, file);
      setStatusMsg({ type: "success", text: "Lease agreement uploaded successfully!" });
      await fetchInfo();
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e?.response?.data?.detail ?? "Upload failed." });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete the uploaded lease agreement? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await leaseAgreementAPI.delete(tenantId);
      setStatusMsg({ type: "success", text: "Agreement deleted." });
      setInfo({ has_agreement: false });
    } catch {
      setStatusMsg({ type: "error", text: "Failed to delete. Please try again." });
    } finally {
      setDeleting(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (loading) return (
    <div className="glass-card" style={{ textAlign: "center", padding: "2rem", color: "hsl(215,20%,55%)" }}>
      Loading agreement info...
    </div>
  );

  return (
    <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,hsl(214,100%,60%),hsl(262,80%,65%))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FileText size={18} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 2 }}>Lease Agreement</h2>
          <p style={{ fontSize: "0.75rem", color: "hsl(215,20%,55%)" }}>Upload and manage the signed lease document</p>
        </div>
      </div>

      {statusMsg && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0.7rem 1rem", borderRadius: 10,
          fontSize: "0.82rem", fontWeight: 500,
          background: statusMsg.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          color: statusMsg.type === "success" ? "hsl(142,70%,60%)" : "hsl(0,85%,70%)",
          border: "1px solid " + (statusMsg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"),
        }}>
          {statusMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {info?.has_agreement ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "1rem", background: "hsl(222,35%,14%)", borderRadius: 12, border: "1px solid rgba(34,197,94,0.2)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <File size={22} color="hsl(142,70%,60%)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.filename}</div>
              <div style={{ fontSize: "0.72rem", color: "hsl(215,20%,55%)" }}>{info.file_size_kb} KB</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <a href={leaseAgreementAPI.downloadUrl(tenantId)} download style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.45rem 0.875rem", borderRadius: 8, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "hsl(214,100%,65%)", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
                <Download size={13} /> Download
              </a>
              <button onClick={handleDelete} disabled={deleting} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.45rem 0.875rem", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", color: "hsl(0,85%,65%)", fontSize: "0.78rem", fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                <Trash2 size={13} /> {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "hsl(215,20%,50%)", textAlign: "center" }}>To replace this file, upload a new one below.</p>
        </div>
      ) : (
        <div style={{ fontSize: "0.8rem", color: "hsl(215,20%,50%)", textAlign: "center", padding: "0.25rem 0" }}>No lease agreement uploaded yet.</div>
      )}

      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => !uploading && fileInputRef.current?.click()} style={{ border: "2px dashed " + (dragOver ? "hsl(214,100%,60%)" : "hsl(215,25%,25%)"), borderRadius: 14, padding: "2rem", textAlign: "center", cursor: uploading ? "not-allowed" : "pointer", background: dragOver ? "rgba(59,130,246,0.06)" : "hsl(222,35%,12%)", transition: "all 0.25s ease", opacity: uploading ? 0.7 : 1 }}>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} disabled={uploading} />
        <div style={{ width: 52, height: 52, borderRadius: 16, background: dragOver ? "rgba(59,130,246,0.2)" : "hsl(215,25%,18%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", transition: "all 0.25s" }}>
          <Upload size={22} color={dragOver ? "hsl(214,100%,65%)" : "hsl(215,20%,55%)"} />
        </div>
        {uploading ? (
          <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(214,100%,65%)" }}>Uploading...</p>
        ) : (
          <>
            <p style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: 4, color: "hsl(210,40%,88%)" }}>Drop file here or <span style={{ color: "hsl(214,100%,65%)" }}>click to browse</span></p>
            <p style={{ fontSize: "0.72rem", color: "hsl(215,20%,50%)" }}>Supports PDF, JPG, PNG, WEBP, DOC, DOCX · Max 20 MB</p>
          </>
        )}
      </div>
    </div>
  );
}

function TenantPaymentsCard({ tenantId }: { tenantId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsAPI.list({ tenant_id: tenantId, limit: 50 })
      .then(res => {
        setPayments(res.data.payments);
      })
      .catch(err => {
        console.error("Error fetching tenant payments", err);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <div style={{ color: "#888880", padding: "1.5rem", textAlign: "center" }}>Loading payments history...</div>;

  return (
    <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#c4714a,#d9916e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard size={18} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 2 }}>Payments Ledger</h2>
          <p style={{ fontSize: "0.75rem", color: "#888880" }}>Rent receipts and billing history for this tenant</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div style={{ padding: "1.5rem", textAlign: "center", color: "#888880", fontSize: "0.82rem" }}>
          No payments logged for this tenant yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(44,44,44,0.08)" }}>
                {["Due Date", "Paid Date", "Amount Due", "Amount Paid", "Status"].map((h) => (
                  <th key={h} style={{ padding: "0.6rem 0.875rem", textAlign: "left", color: "#888880", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: 700, background: "#faf7f2" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                let statusLabel = "Outstanding";
                let badgeClass = "badge-medium";
                let statusDot = "#c4a44a";

                if (p.is_missed) {
                  statusLabel = "Missed";
                  badgeClass = "badge-high";
                  statusDot = "#c4714a";
                } else if (p.paid_date) {
                  if (p.days_late > 0) {
                    statusLabel = `Late (${p.days_late}d)`;
                    badgeClass = "badge-medium";
                    statusDot = "#c4a44a";
                  } else {
                    statusLabel = "Paid";
                    badgeClass = "badge-low";
                    statusDot = "#4e7a54";
                  }
                }

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(44,44,44,0.06)" }}>
                    <td style={{ padding: "0.75rem 0.875rem" }}>{new Date(p.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td style={{ padding: "0.75rem 0.875rem", color: p.paid_date ? "inherit" : "#888880", fontStyle: p.paid_date ? "normal" : "italic" }}>
                      {p.paid_date ? new Date(p.paid_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Pending"}
                    </td>
                    <td style={{ padding: "0.75rem 0.875rem", fontWeight: 600 }}>₹{p.amount_due.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "0.75rem 0.875rem" }}>₹{p.amount_paid.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "0.75rem 0.875rem" }}>
                      <span className={badgeClass}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot, display: "inline-block" }} />
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [language, setLanguage] = useState("en");
  const [activeTab, setActiveTab] = useState<"overview" | "shap" | "retention" | "lease" | "payments">("overview");

  useEffect(() => {
    if (!id) return;
    Promise.all([tenantsAPI.get(id), predictionsAPI.getForTenant(id, 1)])
      .then(([tRes, pRes]) => {
        setTenant(tRes.data);
        if (pRes.data?.length) setPrediction(pRes.data[0]);
      }).catch(() => {
        setTenant({ id, full_name: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210", city: "Chennai", property_type: "2BHK", preferred_language: "Tamil", tenant_age: 34, engagement_score: 0.42, satisfaction_score: 5.8, communication_score: 0.55, sentiment_score: -0.2, portal_logins_last_30d: 3, complaints_filed: 2 });
        setPrediction({ risk_score: 0.73, risk_score_pct: 73, risk_level: "high", will_not_renew: true, shap_values: { "Payment Consistency": 0.18, "Tenant Engagement": 0.15, "Feedback Sentiment": -0.09, "Maintenance Requests": 0.12, "Satisfaction Score": -0.11, "Rent Increase %": 0.08, "Portal Logins (30d)": -0.06, "Complaints Filed": 0.07 }, predicted_at: new Date().toISOString() });
      }).finally(() => setLoading(false));
  }, [id]);

  const runPrediction = async () => {
    setPredicting(true);
    try { const res = await predictionsAPI.predict({ tenant_id: id }); setPrediction(res.data); } catch { } finally { setPredicting(false); }
  };

  const loadRetention = async () => {
    if (retention) return;
    try { const res = await retentionAPI.get(id, language); setRetention(res.data); }
    catch { setRetention({ strategies: [{ category: "Financial", action: "Offer a 5% loyalty discount for early renewal", priority: "high", estimated_impact: "Reduces churn by ~30%" }, { category: "Maintenance", action: "Resolve all pending maintenance requests within 7 days", priority: "high", estimated_impact: "Improves satisfaction by 1.5 points" }], ai_message: "Dear Priya, we truly value your stay with us." }); }
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: string; label: string; icon: any }) => (
    <button id={`tab-${tab}`} onClick={() => { setActiveTab(tab as any); if (tab === "retention") loadRetention(); }} style={{ padding: "0.6rem 1.125rem", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.83rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease", background: activeTab === tab ? "linear-gradient(135deg,hsl(214,100%,60%),hsl(262,80%,65%))" : "hsl(222,35%,16%)", color: activeTab === tab ? "white" : "hsl(215,20%,60%)" }}>
      <Icon size={14} /> {label}
    </button>
  );

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "hsl(215,20%,55%)" }}>Loading tenant...</div>;
  if (!tenant) return <div style={{ padding: "3rem", textAlign: "center", color: "hsl(0,85%,60%)" }}>Tenant not found</div>;

  return (
    <div className="fade-in-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,hsl(214,100%,60%),hsl(262,80%,65%))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-outfit)", marginBottom: 4 }}>{tenant.full_name}</h1>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "hsl(215,20%,55%)" }}><Mail size={12} />{tenant.email}</span>
              {tenant.phone && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "hsl(215,20%,55%)" }}><Phone size={12} />{tenant.phone}</span>}
              {tenant.city && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "hsl(215,20%,55%)" }}><MapPin size={12} />{tenant.city}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LanguageSwitcher value={language} onChange={setLanguage} />
          <button id="run-prediction-tenant-btn" className="btn-primary" onClick={runPrediction} disabled={predicting}><Brain size={15} /> {predicting ? "Running..." : "Run Prediction"}</button>
        </div>
      </div>

      {prediction && (
        <div className="glass-card" style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <RiskGauge score={prediction.risk_score_pct} size={180} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0", flex: 1, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              { label: "ENGAGEMENT", value: `${(tenant.engagement_score * 100).toFixed(0)}%`, color: tenant.engagement_score > 0.6 ? "hsl(142,70%,50%)" : "hsl(38,95%,58%)" },
              { label: "SATISFACTION", value: `${tenant.satisfaction_score.toFixed(1)}/10`, color: tenant.satisfaction_score >= 7 ? "hsl(142,70%,50%)" : "hsl(38,95%,58%)" },
              { label: "PORTAL LOGINS", value: tenant.portal_logins_last_30d, color: "hsl(214,100%,65%)" },
              { label: "COMPLAINTS", value: tenant.complaints_filed, color: tenant.complaints_filed > 2 ? "hsl(0,85%,60%)" : "hsl(215,20%,65%)" },
              { label: "SENTIMENT", value: tenant.sentiment_score.toFixed(2), color: tenant.sentiment_score > 0 ? "hsl(142,70%,50%)" : "hsl(0,85%,60%)" },
              { label: "PREFERRED LANG", value: tenant.preferred_language, color: "hsl(215,20%,85%)" },
            ].map(({ label, value, color }, idx) => (
              <div key={label} style={{
                padding: "1.1rem 1.25rem",
                borderRight: idx % 3 !== 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                borderBottom: idx < 3 ? "1px solid rgba(255,255,255,0.07)" : "none",
                background: "hsl(222,35%,14%)",
              }}>
                <div style={{ fontSize: "0.65rem", color: "hsl(215,20%,48%)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <TabButton tab="overview" label="Overview" icon={Activity} />
        <TabButton tab="payments" label="Billing History" icon={CreditCard} />
        <TabButton tab="shap" label="SHAP Explanation" icon={Brain} />
        <TabButton tab="retention" label="Retention Strategies" icon={Shield} />
        <TabButton tab="lease" label="Lease Agreement" icon={FileText} />
      </div>

      {activeTab === "shap" && prediction?.shap_values && (
        <div className="glass-card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Feature Impact on Risk Score</h2>
          <p style={{ fontSize: "0.8rem", color: "hsl(215,20%,55%)", marginBottom: "1.5rem" }}>Red bars increase non-renewal probability. Green bars decrease it. Larger bars = stronger impact.</p>
          <SHAPWaterfallChart shapValues={prediction.shap_values} />
        </div>
      )}

      {activeTab === "retention" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {retention?.ai_message && (
            <div className="glass-card">
              <div style={{ fontSize: "0.72rem", color: "hsl(214,100%,65%)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>AI-Generated Retention Message</div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "hsl(210,40%,88%)", fontStyle: "italic" }}>"{retention.ai_message}"</p>
            </div>
          )}
          {retention?.strategies?.map((s: any, i: number) => (
            <div key={i} className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "hsl(214,100%,65%)", background: "rgba(59,130,246,0.1)", padding: "2px 8px", borderRadius: 6 }}>{s.category}</span>
                <span className={s.priority === "critical" || s.priority === "high" ? "badge-high" : s.priority === "medium" ? "badge-medium" : "badge-low"}>{s.priority}</span>
              </div>
              <p style={{ fontSize: "0.88rem", color: "hsl(210,40%,90%)", marginBottom: 8, lineHeight: 1.6 }}>{s.action}</p>
              <p style={{ fontSize: "0.75rem", color: "hsl(215,20%,55%)" }}>Impact: {s.estimated_impact}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "overview" && (
        <div className="glass-card">
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1.25rem", color: "hsl(210,40%,92%)" }}>Tenant Profile</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.875rem" }}>
            {[
              { label: "Property Type", value: tenant.property_type || "N/A", icon: <Home size={15} />, accent: "hsl(214,100%,65%)" },
              { label: "Age", value: tenant.tenant_age ? `${tenant.tenant_age} yrs` : "N/A", icon: <User size={15} />, accent: "hsl(262,80%,70%)" },
              { label: "Communication Score", value: `${(tenant.communication_score * 100).toFixed(0)}%`, icon: <MessageSquare size={15} />, accent: "hsl(142,70%,55%)" },
              { label: "Response Rate", value: tenant.response_rate ? `${(tenant.response_rate * 100).toFixed(0)}%` : "N/A", icon: <Activity size={15} />, accent: "hsl(38,95%,60%)" },
            ].map(({ label, value, icon, accent }) => (
              <div key={label} style={{
                background: "hsl(222,35%,13%)",
                borderRadius: 12,
                padding: "1.125rem 1.25rem",
                border: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: `${accent}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: accent,
                }}>{icon}</div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "hsl(215,20%,48%)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "hsl(210,40%,92%)", letterSpacing: "-0.01em" }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "lease" && <LeaseAgreementCard tenantId={id} />}
      {activeTab === "payments" && <TenantPaymentsCard tenantId={id} />}
    </div>
  );
}