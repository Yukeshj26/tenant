"use client";
// Tenants list page — search, filter, risk badges, pagination

import React, { useEffect, useState, useRef } from "react";
import { tenantsAPI, uploadAPI } from "@/lib/api";
import Link from "next/link";
import { Search, Plus, ChevronRight, Upload, ExternalLink, FileText, UserPlus, LogIn, CheckCircle2 } from "lucide-react";

interface Tenant {
  id: string; tenant_code: string; full_name: string; email: string;
  city: string; property_type: string; engagement_score: number;
  satisfaction_score: number; preferred_language: string; created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  high: "#c4714a", medium: "#c4a44a", low: "#4e7a54"
};

// Mock risk levels for display
function getRiskLevel(engagement: number, satisfaction: number): string {
  const score = (1 - engagement) * 0.5 + (1 - satisfaction / 10) * 0.5;
  if (score >= 0.65) return "high";
  if (score >= 0.35) return "medium";
  return "low";
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [csvStatus, setCsvStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 15;

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await tenantsAPI.list({ skip, limit, search: search || undefined });
      setTenants(res.data.tenants);
      setTotal(res.data.total);
    } catch {
      // Mock data
      setTenants(Array.from({ length: 8 }, (_, i) => ({
        id: `t-${i}`, tenant_code: `T0000${i + 1}`,
        full_name: ["Priya Sharma", "Ravi Kumar", "Anita Patel", "Deepak Nair", "Sunita Reddy", "Arjun Singh", "Kavya Menon", "Vijay Rao"][i],
        email: `tenant${i}@example.com`, city: ["Chennai", "Mumbai", "Delhi", "Bangalore"][i % 4],
        property_type: ["2BHK", "3BHK", "Studio", "Apartment"][i % 4],
        engagement_score: 0.3 + Math.random() * 0.6, satisfaction_score: 4 + Math.random() * 5,
        preferred_language: ["English", "Tamil", "Hindi"][i % 3], created_at: new Date().toISOString(),
      })));
      setTotal(8);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTenants(); }, [skip, search]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setCsvStatus(null);

    try {
      const res = await uploadAPI.uploadCSV(file);
      setCsvStatus({
        type: "success",
        text: res.data.message || "CSV tenants imported successfully!",
      });
      fetchTenants();
    } catch (err: any) {
      setCsvStatus({
        type: "error",
        text: err?.response?.data?.detail ?? "Failed to import CSV. Ensure columns match format.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
        <div>
          <div className="section-label">Tenant Management</div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">{total} total records</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCSVUpload}
          />
          <button 
            className="btn-secondary" 
            id="upload-csv-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={15} /> {uploading ? "Importing..." : "Import CSV"}
          </button>
          <Link href="/tenants/new" className="btn-primary" id="add-tenant-link">
            <Plus size={15} /> Add Tenant
          </Link>
        </div>
      </div>

      {/* CSV Import Feedback Alert */}
      {csvStatus && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0.75rem 1.25rem", borderRadius: 12,
          fontSize: "0.85rem", fontWeight: 500, marginBottom: "1.25rem",
          background: csvStatus.type === "success" ? "rgba(78, 122, 84, 0.12)" : "rgba(196, 78, 70, 0.08)",
          color: csvStatus.type === "success" ? "var(--sage-dark)" : "#b83c36",
          border: `1px solid ${csvStatus.type === "success" ? "rgba(78, 122, 84, 0.2)" : "rgba(196, 78, 70, 0.2)"}`
        }}>
          {csvStatus.text}
        </div>
      )}

      {/* TN Government Portal Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(196,113,74,0.06) 0%, rgba(122,158,126,0.08) 100%)",
        border: "1px solid rgba(196,113,74,0.2)",
        borderLeft: "4px solid #c4714a",
        borderRadius: 14,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.5rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: "linear-gradient(135deg, #f7941d, #006400)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: 900, color: "white", flexShrink: 0,
              }}>TN</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#2c2c2c", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  Tamil Nadu Tenancy Registration
                </div>
                <div style={{ fontSize: "0.67rem", color: "#888880", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Official Government Portal
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#555550", lineHeight: 1.6, margin: "0 0 0.875rem 0" }}>
              If a tenant does not have a registered tenancy agreement, they can register one through
              the official Tamil Nadu Government Portal under the Tamil Nadu Regulation of Rights and
              Responsibilities of Landlords and Tenants Act, 2017.
            </p>

            {/* Registration workflow steps */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: "0.875rem" }}>
              {[
                { icon: UserPlus, label: "Register User" },
                { icon: LogIn,    label: "Login" },
                { icon: FileText, label: "Register Agreement" },
                { icon: Upload,   label: "Upload Signed" },
                { icon: CheckCircle2, label: "Get Certificate" },
              ].map(({ icon: Icon, label }, i, arr) => (
                <React.Fragment key={label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.3rem 0.625rem", background: "rgba(255,255,255,0.7)", borderRadius: 999, border: "1px solid rgba(44,44,44,0.1)" }}>
                    <Icon size={11} color="#c4714a" />
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#444", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight key={`arrow-${i}`} size={12} color="#888880" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
            <a
              href="https://www.tenancy.tn.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              id="tn-portal-main-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "0.65rem 1.25rem",
                background: "linear-gradient(135deg, #c4714a, #d9916e)",
                color: "white", borderRadius: 10, textDecoration: "none",
                fontSize: "0.8rem", fontWeight: 700,
                boxShadow: "0 4px 14px rgba(196,113,74,0.3)",
                whiteSpace: "nowrap",
              }}
            >
              <ExternalLink size={14} /> Register on TN Portal
            </a>
            <a
              href="https://www.tenancy.tn.gov.in/Home/Registration"
              target="_blank"
              rel="noopener noreferrer"
              id="tn-new-user-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "0.55rem 1.25rem",
                background: "rgba(255,255,255,0.8)",
                color: "#444", borderRadius: 10, textDecoration: "none",
                fontSize: "0.75rem", fontWeight: 600,
                border: "1px solid rgba(44,44,44,0.12)",
                whiteSpace: "nowrap",
              }}
            >
              <UserPlus size={13} /> New User Registration
            </a>
            <a
              href="https://www.tenancy.tn.gov.in/Home/Login"
              target="_blank"
              rel="noopener noreferrer"
              id="tn-login-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "0.55rem 1.25rem",
                background: "rgba(255,255,255,0.8)",
                color: "#444", borderRadius: 10, textDecoration: "none",
                fontSize: "0.75rem", fontWeight: 600,
                border: "1px solid rgba(44,44,44,0.12)",
                whiteSpace: "nowrap",
              }}
            >
              <LogIn size={13} /> Login to Portal
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: "0.875rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(44,44,44,0.07)", fontSize: "0.64rem", color: "#888880" }}>
          📋 <strong>Process:</strong> Register New User → Login → Register Tenancy Agreement → Upload Signed Agreement → Submit → Rent Authority Verification → Certificate of Registration
          &nbsp;&bull;&nbsp;
          <a href="https://www.tenancy.tn.gov.in/" target="_blank" rel="noopener noreferrer" style={{ color: "#c4714a", textDecoration: "none", fontWeight: 600 }}>Official Portal</a>
          &nbsp;&bull;&nbsp;
          <a href="https://www.tenancy.tn.gov.in/public/uploads/manual/UserManual.pdf" target="_blank" rel="noopener noreferrer" style={{ color: "#c4714a", textDecoration: "none", fontWeight: 600 }}>User Manual</a>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#888880" }} />
        <input
          id="tenant-search"
          className="input-field"
          style={{ paddingLeft: 40 }}
          placeholder="Search by name or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setSkip(0); }}
        />
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(44,44,44,0.08)" }}>
              {["Tenant", "City", "Property", "Language", "Risk Level", "Satisfaction", ""].map((h) => (
                <th key={h} style={{
                  padding: "0.875rem 1.25rem", textAlign: "left",
                  fontSize: "0.72rem", fontWeight: 700, color: "var(--charcoal-soft)",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  background: "var(--cream)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} style={{ padding: "1rem 1.25rem" }}>
                      <div className="skeleton" style={{ height: 14, width: j === 0 ? 140 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : tenants.map((t) => {
              const risk = getRiskLevel(t.engagement_score, t.satisfaction_score);
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid rgba(44,44,44,0.06)", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(122,158,126,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2, color: "var(--charcoal)" }}>{t.full_name}</div>
                    <div style={{ fontSize: "0.73rem", color: "var(--charcoal-soft)", fontWeight: 500 }}>{t.email}</div>
                  </td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: "var(--charcoal)", fontWeight: 500 }}>{t.city}</td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: "var(--charcoal)", fontWeight: 500 }}>{t.property_type}</td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: "var(--charcoal-soft)", fontWeight: 500 }}>{t.preferred_language}</td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span className={`badge-${risk}`}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: RISK_COLORS[risk] }} />
                      {risk.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem" }}>
                    <span style={{ color: t.satisfaction_score >= 7 ? "var(--sage-dark)" : t.satisfaction_score >= 5 ? "#9a6400" : "#b83c36", fontWeight: 700 }}>
                      {t.satisfaction_score.toFixed(1)}/10
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <Link href={`/tenants/${t.id}`} id={`view-tenant-${t.id}`}
                      style={{ color: "var(--sage-dark)", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      View <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderTop: "1px solid rgba(44,44,44,0.06)" }}>
          <span style={{ fontSize: "0.78rem", color: "#888880" }}>
            Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" id="prev-page-btn" onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip === 0} style={{ padding: "0.4rem 0.875rem", opacity: skip === 0 ? 0.4 : 1 }}>
              Previous
            </button>
            <button className="btn-secondary" id="next-page-btn" onClick={() => setSkip(skip + limit)} disabled={skip + limit >= total} style={{ padding: "0.4rem 0.875rem", opacity: skip + limit >= total ? 0.4 : 1 }}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
