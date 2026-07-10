"""
TenantSense AI — XGBoost Predictor
Loads the trained pipeline model, runs inference, and returns risk score + SHAP values.
"""
import joblib
import os
from datetime import date
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
MODEL_PATH = os.path.join(PROJECT_ROOT, "machine_learning", "models", "xgboost_model.pkl")

FEATURE_COLS = [
    "monthly_rent", "bedrooms", "bathrooms", "property_size", "city",
    "furnishing_status", "tenant_preferred", "area_type", "tenant_tenure_months",
    "lease_duration_months", "previous_renewals", "rent_increase_percent",
    "late_payment_count", "avg_days_late", "missed_payment_count",
    "payment_consistency_score", "maintenance_request_count", "avg_resolution_days",
    "maintenance_satisfaction", "complaint_count", "complaint_severity_score",
    "portal_login_count", "survey_score", "occupancy_rate"
]


def build_features_from_tenant(tenant) -> dict:
    """Helper to convert Tenant database model (or a fallback dict) into model feature dict."""
    if isinstance(tenant, dict):
        return {col: tenant.get(col, 0.0) for col in FEATURE_COLS}

    # 1. Lease features
    active_lease = None
    if hasattr(tenant, "leases") and tenant.leases:
        for lease in tenant.leases:
            if getattr(lease, "is_active", True):
                active_lease = lease
                break
        if not active_lease:
            active_lease = tenant.leases[0]
        
    monthly_rent = getattr(active_lease, "monthly_rent", 25000.0)
    lease_duration_months = getattr(active_lease, "lease_duration_months", 12)
    rent_increase_percent = getattr(active_lease, "rent_increase_pct", 5.0)
    
    # Extract bedrooms, bathrooms, size
    property_type = str(getattr(tenant, "property_type", "2BHK")).upper()
    bedrooms = 2
    if "1BHK" in property_type or "STUDIO" in property_type:
        bedrooms = 1
    elif "2BHK" in property_type:
        bedrooms = 2
    elif "3BHK" in property_type:
        bedrooms = 3
    elif "4BHK" in property_type:
        bedrooms = 4
        
    bathrooms = max(1, bedrooms - 1) if "STUDIO" not in property_type else 1
    
    property_size = 1000
    if bedrooms == 1:
        property_size = 500
    elif bedrooms == 2:
        property_size = 1000
    elif bedrooms == 3:
        property_size = 1500
    elif bedrooms >= 4:
        property_size = 2200
        
    city = getattr(tenant, "city", "Chennai") or "Chennai"
    furnishing_status = "Semi-Furnished"
    tenant_preferred = "Bachelors/Family"
    area_type = "Apartment"
    
    # 2. Tenure and previous renewals
    tenant_tenure_months = 12
    if active_lease and getattr(active_lease, "lease_start_date", None):
        today = date.today()
        delta = today - active_lease.lease_start_date
        tenant_tenure_months = max(1, delta.days // 30)
    previous_renewals = max(0, tenant_tenure_months // 12)
    
    # 3. Payments features
    payments = getattr(tenant, "payments", []) or []
    late_payment_count = 0
    missed_payment_count = 0
    days_late_sum = 0
    
    for p in payments:
        if getattr(p, "is_missed", False):
            missed_payment_count += 1
        else:
            p_days_late = getattr(p, "days_late", 0) or 0
            if p_days_late > 0:
                late_payment_count += 1
                days_late_sum += p_days_late
            
    avg_days_late = float(days_late_sum / max(1, late_payment_count)) if late_payment_count > 0 else 0.0
    
    payment_consistency_score = float(
        100
        - late_payment_count * 6
        - missed_payment_count * 10
        - avg_days_late * 1.2
    )
    payment_consistency_score = max(0.0, min(100.0, payment_consistency_score))
    
    # 4. Maintenance requests
    maint_requests = getattr(tenant, "maintenance_requests", []) or []
    maintenance_request_count = len(maint_requests)
    
    resolution_days_sum = 0
    resolved_count = 0
    for r in maint_requests:
        if getattr(r, "is_resolved", True) and getattr(r, "resolution_days", 0):
            resolution_days_sum += r.resolution_days
            resolved_count += 1
            
    avg_resolution_days = float(resolution_days_sum / max(1, resolved_count)) if resolved_count > 0 else 3.0
    
    maintenance_satisfaction = float(
        5
        - maintenance_request_count * 0.12
        - avg_resolution_days * 0.08
    )
    maintenance_satisfaction = max(1.0, min(5.0, maintenance_satisfaction))
    
    # 5. Complaints and portal logins
    complaint_count = getattr(tenant, "complaints_filed", 0) or 0
    complaint_severity_score = float(3.0 * complaint_count) if complaint_count > 0 else 1.0
    complaint_severity_score = min(10.0, complaint_severity_score)
    
    portal_login_count = getattr(tenant, "portal_logins_last_30d", 2) or 2
    
    survey_score = float(
        5
        - complaint_count * 0.25
        - complaint_severity_score * 0.12
        + portal_login_count * 0.01
    )
    survey_score = max(1.0, min(5.0, survey_score))
    
    occupancy_rate = 92.0
    
    return {
        "monthly_rent": float(monthly_rent),
        "bedrooms": int(bedrooms),
        "bathrooms": float(bathrooms),
        "property_size": float(property_size),
        "city": city,
        "furnishing_status": furnishing_status,
        "tenant_preferred": tenant_preferred,
        "area_type": area_type,
        "tenant_tenure_months": int(tenant_tenure_months),
        "lease_duration_months": int(lease_duration_months),
        "previous_renewals": int(previous_renewals),
        "rent_increase_percent": float(rent_increase_percent),
        "late_payment_count": int(late_payment_count),
        "avg_days_late": float(avg_days_late),
        "missed_payment_count": int(missed_payment_count),
        "payment_consistency_score": float(payment_consistency_score),
        "maintenance_request_count": int(maintenance_request_count),
        "avg_resolution_days": float(avg_resolution_days),
        "maintenance_satisfaction": float(maintenance_satisfaction),
        "complaint_count": int(complaint_count),
        "complaint_severity_score": float(complaint_severity_score),
        "portal_login_count": int(portal_login_count),
        "survey_score": float(survey_score),
        "occupancy_rate": float(occupancy_rate),
    }


class TenantPredictor:
    """Singleton-style predictor — loads model once and reuses."""

    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load(self):
        if self._model is None:
            if not os.path.exists(MODEL_PATH):
                raise FileNotFoundError(
                    f"Model not found at {MODEL_PATH}."
                )
            self._model = joblib.load(MODEL_PATH)

    def predict(self, tenant) -> dict:
        """
        Predict non-renewal probability for a single tenant (accepts DB Tenant model or dict).
        Returns: {risk_score, will_not_renew, shap_values}
        """
        self._load()

        feature_dict = build_features_from_tenant(tenant)
        row = pd.DataFrame([feature_dict])

        # Run prediction via pipeline (which contains preprocessor ColumnTransformer)
        risk_score = float(self._model.predict_proba(row)[0][1])
        will_not_renew = risk_score >= 0.5

        # SHAP values
        try:
            from machine_learning.explainability.shap_explainer import SHAPExplainer
            explainer = SHAPExplainer()
            shap_values = explainer.explain(feature_dict)
        except Exception:
            shap_values = {}

        return {
            "risk_score": round(risk_score, 4),
            "will_not_renew": will_not_renew,
            "shap_values": shap_values,
        }

    def predict_batch(self, tenants) -> list:
        """Predict for a batch list of tenants/dicts."""
        self._load()
        rows_data = [build_features_from_tenant(t) for t in tenants]
        df = pd.DataFrame(rows_data)

        probs = self._model.predict_proba(df)[:, 1]
        
        results = []
        for i, t in enumerate(tenants):
            risk_score = float(probs[i])
            risk_level = "low"
            if risk_score >= 0.70:
                risk_level = "high"
            elif risk_score >= 0.40:
                risk_level = "medium"
            results.append({
                "risk_score": round(risk_score, 4),
                "will_not_renew": risk_score >= 0.5,
                "risk_level": risk_level
            })
        return results

