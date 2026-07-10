"use client";
// Payments Ledger page — Search, Filter, Record, Receive Payments

import React, { useEffect, useState } from "react";
import { paymentsAPI, tenantsAPI } from "@/lib/api";
import { Search, Plus, Filter, CheckCircle2, AlertCircle, Clock, CreditCard, Loader2, DollarSign, X } from "lucide-react";

interface Payment {
  id: string;
  tenant_id: string;
  tenant_name: string;
  due_date: string;
  paid_date: string | null;
  amount_due: number;
  amount_paid: number;
  days_late: number;
  is_missed: boolean;
}

interface Tenant {
  id: string;
  full_name: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  
  // Form states
  const [newPayment, setNewPayment] = useState({
    tenant_id: "",
    due_date: new Date().toISOString().split("T")[0],
    amount_due: "",
    amount_paid: "",
    paid_date: "",
    is_missed: false,
  });

  const [receivePayment, setReceivePayment] = useState({
    id: "",
    tenant_name: "",
    amount_due: 0,
    amount_paid: "",
    paid_date: new Date().toISOString().split("T")[0],
  });

  const limit = 20;

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentsAPI.list({
        skip,
        limit,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined,
      });
      setPayments(res.data.payments);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Error fetching payments", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await tenantsAPI.list({ limit: 100 });
      setTenants(res.data.tenants);
    } catch (err) {
      console.error("Error fetching tenants list", err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [skip, search, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        tenant_id: newPayment.tenant_id,
        due_date: newPayment.due_date,
        amount_due: parseFloat(newPayment.amount_due),
        amount_paid: newPayment.amount_paid ? parseFloat(newPayment.amount_paid) : 0.0,
        paid_date: newPayment.paid_date || null,
        is_missed: newPayment.is_missed,
        days_late: 0,
      };

      await paymentsAPI.create(payload);
      setShowRecordModal(false);
      setNewPayment({
        tenant_id: "",
        due_date: new Date().toISOString().split("T")[0],
        amount_due: "",
        amount_paid: "",
        paid_date: "",
        is_missed: false,
      });
      fetchPayments();
      alert("Payment ledger record created successfully!");
    } catch (err: any) {
      alert("Failed to record payment: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await paymentsAPI.pay(receivePayment.id, {
        amount_paid: parseFloat(receivePayment.amount_paid),
        paid_date: receivePayment.paid_date,
      });
      setShowReceiveModal(false);
      fetchPayments();
      alert("Payment transaction received and logged successfully!");
    } catch (err: any) {
      alert("Failed to receive payment: " + (err.response?.data?.detail || err.message));
    }
  };

  // Compute local summary statistics
  const totalRevenue = payments.reduce((acc, p) => acc + p.amount_paid, 0);
  const outstandingAmount = payments.reduce((acc, p) => acc + (p.amount_due - p.amount_paid), 0);
  const missedCount = payments.filter(p => p.is_missed).length;
  const totalDueCount = payments.length;
  const onTimeCount = payments.filter(p => p.paid_date && p.days_late === 0).length;
  const onTimeRate = totalDueCount > 0 ? Math.round((onTimeCount / totalDueCount) * 100) : 100;

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
        <div>
          <div className="section-label">Ledger Ledger</div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Track rent collection and outstanding dues</p>
        </div>
        <button className="btn-primary" onClick={() => setShowRecordModal(true)}>
          <Plus size={15} /> Record Invoice/Due
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        marginBottom: "1.5rem",
      }}>
        {/* Total Collected */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888880" }}>
              Total Collected
            </span>
            <DollarSign size={16} color="#4e7a54" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2c2c2c", marginTop: "0.5rem" }}>
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#4e7a54", fontWeight: 600, marginTop: "0.25rem" }}>
            In current ledger page
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="stat-card" style={{ borderColor: outstandingAmount > 0 ? "rgba(196,113,74,0.3)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888880" }}>
              Outstanding Dues
            </span>
            <Clock size={16} color="#c4714a" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: outstandingAmount > 0 ? "#c4714a" : "#2c2c2c", marginTop: "0.5rem" }}>
            ₹{outstandingAmount.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#888880", marginTop: "0.25rem" }}>
            Pending balance
          </div>
        </div>

        {/* Missed Payments */}
        <div className="stat-card" style={{ borderColor: missedCount > 0 ? "rgba(196,78,70,0.3)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888880" }}>
              Missed Invoices
            </span>
            <AlertCircle size={16} color="#c4714a" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: missedCount > 0 ? "#b83c36" : "#2c2c2c", marginTop: "0.5rem" }}>
            {missedCount}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#888880", marginTop: "0.25rem" }}>
            Marked as defaulted
          </div>
        </div>

        {/* On-Time Rate */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888880" }}>
              On-Time Rate
            </span>
            <CheckCircle2 size={16} color="#4e7a54" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2c2c2c", marginTop: "0.5rem" }}>
            {onTimeRate}%
          </div>
          <div style={{ fontSize: "0.68rem", color: "#4e7a54", fontWeight: 600, marginTop: "0.25rem" }}>
            Early/On-time renewals
          </div>
        </div>
      </div>

      {/* Filter and Search Row */}
      <div style={{ display: "flex", gap: "0.875rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#888880" }} />
          <input
            id="payment-search"
            className="input-field"
            style={{ paddingLeft: 40 }}
            placeholder="Search by tenant name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSkip(0); }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Filter size={15} color="#888880" />
          <select
            id="status-filter"
            className="input-field"
            style={{ width: 160, paddingRight: 34 }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSkip(0); }}
          >
            <option value="all">All Dues</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Outstanding</option>
            <option value="late">Paid Late</option>
            <option value="missed">Missed Default</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(44,44,44,0.08)" }}>
              {["Tenant Name", "Due Date", "Paid Date", "Amount Due", "Amount Paid", "Status", "Actions"].map((h) => (
                <th key={h} style={{
                  padding: "0.875rem 1.25rem", textAlign: "left",
                  fontSize: "0.7rem", fontWeight: 700, color: "#888880",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  background: "#faf7f2",
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
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#888880" }}>
                  <CreditCard size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                  <div>No payments found matching the selection.</div>
                </td>
              </tr>
            ) : payments.map((p) => {
              // Determine status
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
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(44,44,44,0.06)", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(122,158,126,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "#2c2c2c" }}>
                    {p.tenant_name}
                  </td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: "#444" }}>
                    {new Date(p.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: p.paid_date ? "#444" : "#888880", fontStyle: p.paid_date ? "normal" : "italic" }}>
                    {p.paid_date 
                      ? new Date(p.paid_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "Pending"}
                  </td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", fontWeight: 600 }}>
                    ₹{p.amount_due.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: p.amount_paid > 0 ? "#4e7a54" : "#888880", fontWeight: p.amount_paid > 0 ? 600 : 400 }}>
                    ₹{p.amount_paid.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span className={badgeClass}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot }} />
                      {statusLabel}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    {!p.paid_date && !p.is_missed && (
                      <button className="btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, borderColor: "#7a9e7e", color: "#4e7a54" }}
                        onClick={() => {
                          setReceivePayment({
                            id: p.id,
                            tenant_name: p.tenant_name,
                            amount_due: p.amount_due,
                            amount_paid: p.amount_due.toString(),
                            paid_date: new Date().toISOString().split("T")[0],
                          });
                          setShowReceiveModal(true);
                        }}>
                        Record Payment
                      </button>
                    )}
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

      {/* RECORD DUE MODAL */}
      {showRecordModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(44,44,44,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          backdropFilter: "blur(4px)",
        }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "480px", margin: "1rem", background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(44,44,44,0.08)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2c2c2c" }}>Record Invoice / Due</h3>
              <button onClick={() => setShowRecordModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Select Tenant */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888880" }}>
                    Select Tenant
                  </label>
                  <select
                    className="input-field"
                    required
                    value={newPayment.tenant_id}
                    onChange={e => setNewPayment(prev => ({ ...prev, tenant_id: e.target.value }))}
                  >
                    <option value="" disabled>Select a tenant</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Due */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888880" }}>
                    Amount Due (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    required
                    placeholder="25000"
                    value={newPayment.amount_due}
                    onChange={e => setNewPayment(prev => ({ ...prev, amount_due: e.target.value }))}
                  />
                </div>

                {/* Due Date */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888880" }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    required
                    value={newPayment.due_date}
                    onChange={e => setNewPayment(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>

                {/* Optional immediate pay fields */}
                <div style={{ borderTop: "1px dashed rgba(44,44,44,0.1)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="already-paid"
                      checked={!!newPayment.paid_date}
                      onChange={e => {
                        setNewPayment(prev => ({
                          ...prev,
                          paid_date: e.target.checked ? new Date().toISOString().split("T")[0] : "",
                          amount_paid: e.target.checked ? prev.amount_due : "",
                        }));
                      }}
                    />
                    <label htmlFor="already-paid" style={{ fontSize: "0.8rem", color: "#444", fontWeight: 500, cursor: "pointer" }}>
                      Already Paid?
                    </label>
                  </div>

                  {newPayment.paid_date && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#888880" }}>
                          Amount Paid (₹)
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          required
                          value={newPayment.amount_paid}
                          onChange={e => setNewPayment(prev => ({ ...prev, amount_paid: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#888880" }}>
                          Payment Date
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          required
                          value={newPayment.paid_date}
                          onChange={e => setNewPayment(prev => ({ ...prev, paid_date: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="is-missed"
                      checked={newPayment.is_missed}
                      onChange={e => setNewPayment(prev => ({ ...prev, is_missed: e.target.checked }))}
                      disabled={!!newPayment.paid_date}
                    />
                    <label htmlFor="is-missed" style={{ fontSize: "0.8rem", color: "#444", fontWeight: 500, cursor: "pointer" }}>
                      Mark as Missed/Defaulted
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem", borderTop: "1px solid rgba(44,44,44,0.08)", paddingTop: "1rem" }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowRecordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE PAYMENT MODAL */}
      {showReceiveModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(44,44,44,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          backdropFilter: "blur(4px)",
        }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "440px", margin: "1rem", background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(44,44,44,0.08)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2c2c2c" }}>Record Rent Received</h3>
              <button onClick={() => setShowReceiveModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleReceivePayment}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ padding: "0.875rem", borderRadius: 10, background: "#faf7f2", border: "1px solid rgba(122,158,126,0.2)" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#888880", fontWeight: 700 }}>Tenant</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#2c2c2c" }}>{receivePayment.tenant_name}</div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#888880", fontWeight: 700, marginTop: "0.5rem" }}>Amount Due</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#2c2c2c" }}>₹{receivePayment.amount_due.toLocaleString("en-IN")}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888880" }}>
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    required
                    value={receivePayment.amount_paid}
                    onChange={e => setReceivePayment(prev => ({ ...prev, amount_paid: e.target.value }))}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888880" }}>
                    Payment Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    required
                    value={receivePayment.paid_date}
                    onChange={e => setReceivePayment(prev => ({ ...prev, paid_date: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem", borderTop: "1px solid rgba(44,44,44,0.08)", paddingTop: "1rem" }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowReceiveModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Log Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
