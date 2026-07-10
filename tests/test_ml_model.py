"""
TenantSense AI — ML Model Tests
Verifies model accuracy targets (AUC ≥ 0.90, F1 ≥ 0.85)
Run: pytest tests/test_ml_model.py -v
"""

import os
import sys
import pytest
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
sys.path.insert(0, PROJECT_ROOT)

METRICS_PATH = os.path.join(PROJECT_ROOT, "machine_learning", "models", "training_metrics.json")
MODEL_PATH = os.path.join(PROJECT_ROOT, "machine_learning", "models", "xgboost_model.pkl")


@pytest.fixture(scope="module")
def metrics():
    if not os.path.exists(METRICS_PATH):
        pytest.skip("Model not trained yet. Run: python machine_learning/training/train_xgboost.py")
    with open(METRICS_PATH) as f:
        return json.load(f)


class TestModelAccuracy:
    def test_model_file_exists(self):
        assert os.path.exists(MODEL_PATH), "Model file missing. Run training pipeline."

    def test_metrics_file_exists(self):
        assert os.path.exists(METRICS_PATH), "Metrics file missing. Run training pipeline."

    def test_auc_roc_target(self, metrics):
        """AUC-ROC must be ≥ 0.90 as per NFR."""
        auc = metrics["auc_roc"]
        assert auc >= 0.90, f"AUC-ROC = {auc:.4f} is below the 0.90 target"

    def test_f1_score_target(self, metrics):
        """F1 score must be ≥ 0.85."""
        f1 = metrics["f1_score"]
        assert f1 >= 0.85, f"F1 = {f1:.4f} is below 0.85 target"

    def test_precision_not_too_low(self, metrics):
        """Precision ≥ 0.80 to avoid too many false alarms."""
        precision = metrics["precision"]
        assert precision >= 0.80, f"Precision = {precision:.4f} is too low"

    def test_recall_adequate(self, metrics):
        """Recall ≥ 0.80 — we must not miss at-risk tenants."""
        recall = metrics["recall"]
        assert recall >= 0.80, f"Recall = {recall:.4f} — too many non-renewals missed"


class TestPredictor:
    def test_predictor_loads(self):
        if not os.path.exists(MODEL_PATH):
            pytest.skip("Model not trained yet")
        from machine_learning.prediction.predictor import TenantPredictor
        predictor = TenantPredictor()
        assert predictor is not None

    def test_predict_single(self):
        if not os.path.exists(MODEL_PATH):
            pytest.skip("Model not trained yet")
        from machine_learning.prediction.predictor import TenantPredictor
        predictor = TenantPredictor()
        features = {
            "payment_consistency": 0.4, "engagement_score": 0.3, "satisfaction_score": 4.5,
            "sentiment_score": -0.3, "days_to_expiry": 60, "late_payments": 3,
            "missed_payments": 1, "avg_days_late": 8.0, "maintenance_requests": 5,
            "unresolved_issues": 2, "avg_resolution_days": 9.0, "rent_increase_pct": 12.0,
            "market_rent_ratio": 1.2, "nearby_vacancy_rate": 0.12, "communication_score": 0.35,
            "response_rate": 0.4, "portal_logins_last_30d": 1, "complaints_filed": 4,
        }
        result = predictor.predict(features)
        assert 0.0 <= result["risk_score"] <= 1.0
        assert isinstance(result["will_not_renew"], bool)
        # High-risk features should produce high risk score
        assert result["risk_score"] > 0.5, "Expected high risk score for distressed tenant"

    def test_predict_low_risk(self):
        if not os.path.exists(MODEL_PATH):
            pytest.skip("Model not trained yet")
        from machine_learning.prediction.predictor import TenantPredictor
        predictor = TenantPredictor()
        features = {
            "payment_consistency": 0.95, "engagement_score": 0.9, "satisfaction_score": 9.0,
            "sentiment_score": 0.8, "days_to_expiry": 200, "late_payments": 0,
            "missed_payments": 0, "avg_days_late": 0.0, "maintenance_requests": 1,
            "unresolved_issues": 0, "avg_resolution_days": 2.0, "rent_increase_pct": 2.0,
            "market_rent_ratio": 0.9, "nearby_vacancy_rate": 0.04, "communication_score": 0.85,
            "response_rate": 0.9, "portal_logins_last_30d": 12, "complaints_filed": 0,
        }
        result = predictor.predict(features)
        assert result["risk_score"] < 0.5, "Expected low risk score for engaged tenant"
