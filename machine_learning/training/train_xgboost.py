"""
TenantSense AI — XGBoost Model Training Pipeline
Trains, evaluates, and saves the lease non-renewal prediction model.
Run: python machine_learning/training/train_xgboost.py
"""

import os
import sys
import pickle
import json
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, f1_score, roc_auc_score,
    precision_score, recall_score, classification_report, confusion_matrix,
)
from sklearn.utils.class_weight import compute_sample_weight
from imblearn.over_sampling import SMOTE
import xgboost as xgb

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.insert(0, PROJECT_ROOT)

# ─── Paths ───────────────────────────────────────────────────────────────────
DATASET_PATH = os.path.join(PROJECT_ROOT, "datasets", "tenant_data.csv")
MODEL_DIR = os.path.join(PROJECT_ROOT, "machine_learning", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "training_metrics.json")

# ─── Feature columns ─────────────────────────────────────────────────────────
FEATURE_COLS = [
    "payment_consistency",
    "engagement_score",
    "satisfaction_score",
    "sentiment_score",
    "days_to_expiry",
    "late_payments",
    "missed_payments",
    "avg_days_late",
    "maintenance_requests",
    "unresolved_issues",
    "avg_resolution_days",
    "rent_increase_pct",
    "market_rent_ratio",
    "nearby_vacancy_rate",
    "communication_score",
    "response_rate",
    "portal_logins_last_30d",
    "complaints_filed",
]
TARGET_COL = "will_not_renew"

# ─── XGBoost Hyperparameters ─────────────────────────────────────────────────
XGBOOST_PARAMS = {
    "n_estimators": 400,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "objective": "binary:logistic",
    "eval_metric": "auc",
    "random_state": 42,
    "n_jobs": -1,
    "use_label_encoder": False,
}


def load_data() -> tuple:
    print(f"📂 Loading dataset from: {DATASET_PATH}")
    if not os.path.exists(DATASET_PATH):
        print("⚠️  Dataset not found. Generating synthetic data...")
        os.system(f"python {os.path.join(PROJECT_ROOT, 'datasets', 'generate_synthetic_data.py')}")

    df = pd.read_csv(DATASET_PATH)
    print(f"✅ Loaded {len(df):,} records | Columns: {len(df.columns)}")
    print(f"   Non-renewal rate: {df[TARGET_COL].mean():.1%}")

    # Ensure all feature columns exist
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0
            print(f"   ⚠️  Missing column '{col}' — filled with 0.0")

    X = df[FEATURE_COLS].fillna(0)
    y = df[TARGET_COL].astype(int)
    return X, y


def preprocess(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2):
    print("\n🔧 Preprocessing...")

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # SMOTE to handle class imbalance
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train_scaled, y_train)
    print(f"   After SMOTE — Train: {len(X_train_res):,} | Class balance: {y_train_res.mean():.1%}")

    return X_train_res, X_test_scaled, y_train_res, y_test, scaler


def train(X_train, y_train, X_test, y_test):
    print("\n🤖 Training XGBoost model...")
    model = xgb.XGBClassifier(**XGBOOST_PARAMS)

    eval_set = [(X_train, y_train), (X_test, y_test)]
    model.fit(
        X_train, y_train,
        eval_set=eval_set,
        verbose=50,
    )
    return model


def evaluate(model, X_test, y_test, X, y) -> dict:
    print("\n📊 Evaluating model...")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "f1_score": round(f1_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred), 4),
        "recall": round(recall_score(y_test, y_pred), 4),
        "auc_roc": round(roc_auc_score(y_test, y_prob), 4),
        "trained_at": datetime.utcnow().isoformat(),
        "n_samples": len(y),
        "feature_cols": FEATURE_COLS,
    }

    print(f"\n   Accuracy  : {metrics['accuracy']:.4f}")
    print(f"   F1 Score  : {metrics['f1_score']:.4f}")
    print(f"   Precision : {metrics['precision']:.4f}")
    print(f"   Recall    : {metrics['recall']:.4f}")
    print(f"   AUC-ROC   : {metrics['auc_roc']:.4f}")

    if metrics["auc_roc"] >= 0.90:
        print(f"\n   ✅ AUC-ROC ≥ 0.90 — Target achieved!")
    else:
        print(f"\n   ⚠️  AUC-ROC = {metrics['auc_roc']:.4f} — Below 0.90 target. Consider more data or tuning.")

    print("\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Will Renew", "Will NOT Renew"]))

    return metrics


def save_artifacts(model, scaler, metrics):
    print(f"\n💾 Saving model to: {MODEL_PATH}")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    print(f"💾 Saving scaler to: {SCALER_PATH}")
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"💾 Metrics saved to: {METRICS_PATH}")


def main():
    print("=" * 60)
    print("  TenantSense AI — XGBoost Training Pipeline")
    print("=" * 60)

    X, y = load_data()
    X_train, X_test, y_train, y_test, scaler = preprocess(X, y)
    model = train(X_train, y_train, X_test, y_test)
    metrics = evaluate(model, X_test, y_test, X, y)
    save_artifacts(model, scaler, metrics)

    print("\n✅ Training pipeline complete!")
    print(f"   Model: {MODEL_PATH}")
    print(f"   Scaler: {SCALER_PATH}")


if __name__ == "__main__":
    main()
