"use client";
// Create Tenant page — Add new tenant form

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { tenantsAPI } from "@/lib/api";
import Link from "next/link";
import { User, Mail, Phone, MapPin, Home, Calendar, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("2BHK");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [tenantAge, setTenantAge] = useState<number | "">("");
  
  // Custom slider metrics
  const [engagementScore, setEngagementScore] = useState(0.5);
  const [satisfactionScore, setSatisfactionScore] = useState(7.0);
  const [communicationScore, setCommunicationScore] = useState(0.6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Full Name and Email are required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      city: city.trim() || null,
      property_type: propertyType || null,
      preferred_language: preferredLanguage,
      tenant_age: tenantAge !== "" ? Number(tenantAge) : null,
      engagement_score: Number(engagementScore),
      satisfaction_score: Number(satisfactionScore),
      communication_score: Number(communicationScore),
    };

    try {
      await tenantsAPI.create(payload);
      setSuccess(true);
      setTimeout(() => {
        router.push("/tenants");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to create tenant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: "750px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <Link href="/tenants" style={{
          width: 36, height: 36, borderRadius: "50%", background: "var(--white)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(122, 158, 126, 0.15)", color: "var(--charcoal)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)", transition: "all 0.2s"
        }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="section-label">Tenant Management</div>
          <h1 className="page-title" style={{ margin: 0 }}>Add New Tenant</h1>
        </div>
      </div>

      {success ? (
        <div className="glass-card" style={{
          textAlign: "center", padding: "3rem 2rem",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem"
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%", background: "rgba(78, 122, 84, 0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sage-dark)"
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Tenant Registered!</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            The tenant has been successfully created. Redirecting to listing...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {error && (
            <div style={{
              background: "rgba(196, 78, 70, 0.08)", color: "#b83c36",
              border: "1px solid rgba(196, 78, 70, 0.2)", borderRadius: 12,
              padding: "0.85rem 1.25rem", fontSize: "0.85rem", fontWeight: 500
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Core Info Section */}
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--sage-dark)", borderBottom: "1px solid var(--cream)", paddingBottom: 6 }}>
              Personal Details
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Full Name *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    className="input-field"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                  <User size={15} style={{ position: "absolute", left: 14, top: 12, color: "var(--muted)" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Email Address *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                  <Mail size={15} style={{ position: "absolute", left: 14, top: 12, color: "var(--muted)" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Phone Number</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                  <Phone size={15} style={{ position: "absolute", left: 14, top: 12, color: "var(--muted)" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Age</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    placeholder="Tenant's age"
                    className="input-field"
                    value={tenantAge}
                    onChange={(e) => setTenantAge(e.target.value === "" ? "" : Number(e.target.value))}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                  <Calendar size={15} style={{ position: "absolute", left: 14, top: 12, color: "var(--muted)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Lease Details Section */}
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--sage-dark)", borderBottom: "1px solid var(--cream)", paddingBottom: 6 }}>
              Property & Language
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>City</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Chennai, Bangalore, etc."
                    className="input-field"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                  <MapPin size={15} style={{ position: "absolute", left: 14, top: 12, color: "var(--muted)" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Property Type</label>
                <div style={{ position: "relative" }}>
                  <select
                    className="input-field"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    style={{ paddingLeft: "2.25rem", appearance: "none" }}
                  >
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Studio">Studio</option>
                  </select>
                  <Home size={15} style={{ position: "absolute", left: 14, top: 12, color: "var(--muted)" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Preferred Language</label>
                <select
                  className="input-field"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Behavior / Risk Parameters */}
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--sage-dark)", borderBottom: "1px solid var(--cream)", paddingBottom: 6 }}>
              Relationship Indicators
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Engagement Score</label>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sage-dark)" }}>{(engagementScore * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={engagementScore}
                  onChange={(e) => setEngagementScore(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--sage)" }}
                />
                <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Frequency of portals logins, lease review, etc.</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Satisfaction Score</label>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sage-dark)" }}>{satisfactionScore.toFixed(1)} / 10.0</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={satisfactionScore}
                  onChange={(e) => setSatisfactionScore(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--sage)" }}
                />
                <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Direct rating given by the tenant in surveys.</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--charcoal-soft)" }}>Communication Score</label>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sage-dark)" }}>{(communicationScore * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={communicationScore}
                  onChange={(e) => setCommunicationScore(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--sage)" }}
                />
                <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Response speed and responsiveness to queries.</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 12,
            borderTop: "1px solid var(--cream)", paddingTop: "1.25rem", marginTop: "0.5rem"
          }}>
            <Link href="/tenants" className="btn-secondary" style={{ padding: "0.5rem 1.5rem" }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                padding: "0.5rem 2rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: loading ? "var(--sage-light)" : "var(--terracotta)",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Saving..." : "Save Tenant"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
