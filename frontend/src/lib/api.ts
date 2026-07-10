// lib/api.ts — Axios instance and typed API helpers

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 60000, // 60s — batch predictions can take time
  headers: { "Content-Type": "application/json" },
});

// ─── Tenants ─────────────────────────────────────────────────────────────────
export const tenantsAPI = {
  list: (params?: { skip?: number; limit?: number; search?: string; city?: string }) =>
    api.get("/tenants/", { params }),
  get: (id: string) => api.get(`/tenants/${id}`),
  create: (data: object) => api.post("/tenants/", data),
  update: (id: string, data: object) => api.patch(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
};

// ─── Predictions ─────────────────────────────────────────────────────────────
export const predictionsAPI = {
  predict: (data: { tenant_id: string }) =>
    api.post("/predictions/", data),
  batch: () =>
    api.post("/predictions/batch"),
  getForTenant: (tenantId: string, limit = 10) =>
    api.get(`/predictions/tenant/${tenantId}`, { params: { limit } }),
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get("/analytics/dashboard"),
  riskDistribution: () => api.get("/analytics/risk-distribution"),
  vacancyForecast: (months = 6) => api.get("/analytics/vacancy-forecast", { params: { months } }),
  revenueForecast: (months = 6) => api.get("/analytics/revenue-forecast", { params: { months } }),
};

// ─── Chatbot ─────────────────────────────────────────────────────────────────
export const chatbotAPI = {
  send: (message: string, language: string, sessionId?: string, tenantContext?: object) =>
    api.post("/chatbot/", { message, language, session_id: sessionId, tenant_context: tenantContext }),
  history: (sessionId: string) => api.get(`/chatbot/history/${sessionId}`),
};

// ─── Retention ───────────────────────────────────────────────────────────────
export const retentionAPI = {
  get: (tenantId: string, language = "en") =>
    api.get(`/retention/${tenantId}`, { params: { language } }),
};

// ─── Upload ──────────────────────────────────────────────────────────────────
export const uploadAPI = {
  uploadCSV: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/upload/tenants/csv", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Lease Agreement ─────────────────────────────────────────────────────────
export const leaseAgreementAPI = {
  upload: (tenantId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/upload/lease-agreement/${tenantId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getInfo: (tenantId: string) =>
    api.get(`/upload/lease-agreement/${tenantId}`),
  downloadUrl: (tenantId: string) =>
    `${API_URL}/api/v1/upload/lease-agreement/download/${tenantId}`,
  delete: (tenantId: string) =>
    api.delete(`/upload/lease-agreement/${tenantId}`),
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  list: (params?: { skip?: number; limit?: number; tenant_id?: string; status?: string; search?: string }) =>
    api.get("/payments/", { params }),
  get: (id: string) => api.get(`/payments/${id}`),
  create: (data: object) => api.post("/payments/", data),
  update: (id: string, data: object) => api.patch(`/payments/${id}`, data),
  pay: (id: string, data: { amount_paid: number; paid_date: string }) =>
    api.post(`/payments/${id}/pay`, data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};


