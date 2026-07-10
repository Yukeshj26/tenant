"""
SHAP Explainability module — generates feature importance and waterfall values.
"""
import joblib
import numpy as np
import pandas as pd
import shap
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
MODEL_PATH = os.path.join(PROJECT_ROOT, "machine_learning", "models", "xgboost_model.pkl")

# Clean labels for numeric features
NUMERIC_LABELS = {
    "num__monthly_rent": "Monthly Rent",
    "num__bedrooms": "Bedrooms Count",
    "num__bathrooms": "Bathrooms Count",
    "num__property_size": "Property Size (sqft)",
    "num__tenant_tenure_months": "Tenant Tenure (months)",
    "num__lease_duration_months": "Lease Duration (months)",
    "num__previous_renewals": "Previous Renewals",
    "num__rent_increase_percent": "Rent Increase %",
    "num__late_payment_count": "Late Payments Count",
    "num__avg_days_late": "Avg Days Late",
    "num__missed_payment_count": "Missed Payments",
    "num__payment_consistency_score": "Payment Consistency Score",
    "num__maintenance_request_count": "Maintenance Requests",
    "num__avg_resolution_days": "Avg Resolution Days",
    "num__maintenance_satisfaction": "Maintenance Satisfaction Score",
    "num__complaint_count": "Complaints Filed",
    "num__complaint_severity_score": "Complaint Severity Score",
    "num__portal_login_count": "Portal Logins count",
    "num__survey_score": "Survey Score",
    "num__occupancy_rate": "Occupancy Rate",
}


class SHAPExplainer:
    def __init__(self):
        self._pipeline = None
        self._model = None
        self._preprocessor = None
        self._explainer = None

    def _load(self):
        if self._pipeline is None:
            self._pipeline = joblib.load(MODEL_PATH)
            self._preprocessor = self._pipeline.named_steps['preprocessor']
            self._model = self._pipeline.named_steps['model']
            self._explainer = shap.TreeExplainer(self._model)

    def explain(self, feature_dict: dict) -> dict:
        """
        Compute SHAP values for a single prediction.
        Returns dict: {feature_label: shap_value} sorted by abs impact.
        """
        self._load()
        row = pd.DataFrame([feature_dict])
        
        # Preprocess features using column transformer
        X_proc = self._preprocessor.transform(row)
        shap_vals = self._explainer.shap_values(X_proc)[0]

        # Get preprocessor transformed feature names
        feature_names = self._preprocessor.get_feature_names_out()

        result = {}
        for name, val in zip(feature_names, shap_vals):
            if abs(val) < 0.0001:
                continue

            # Format the label nicely
            if name.startswith("cat__"):
                # e.g., cat__city_Chennai -> City: Chennai
                clean_name = name.replace("cat__", "")
                parts = clean_name.split("_", 1)
                if len(parts) == 2:
                    category, value = parts
                    label = f"{category.replace('_', ' ').title()}: {value}"
                else:
                    label = clean_name.replace("_", " ").title()
            elif name.startswith("num__"):
                label = NUMERIC_LABELS.get(name, name.replace("num__", "").replace("_", " ").title())
            else:
                label = name

            result[label] = round(float(val), 4)

        # Sort by absolute impact descending and keep top 10 features
        sorted_result = dict(sorted(result.items(), key=lambda x: abs(x[1]), reverse=True)[:10])
        return sorted_result

