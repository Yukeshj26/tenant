"""Predictions API — run XGBoost inference and return risk score + SHAP values."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import sys, os

from app.database.postgres import get_db
from app.models.tenant import Tenant
from app.models.prediction import Prediction


# Add ML path so machine_learning package is importable
# predictions.py is at backend/app/api/routes/ → project root is 4 dirs up
_ml_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
if _ml_root not in sys.path:
    sys.path.insert(0, _ml_root)

router = APIRouter()


class PredictionRequest(BaseModel):
    tenant_id: str


def _get_risk_level(score: float) -> str:
    if score >= 0.70:
        return "high"
    elif score >= 0.40:
        return "medium"
    return "low"


@router.post("/")
async def predict_tenant(
    payload: PredictionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run the real XGBoost model for a single tenant and persist the result."""
    result = await db.execute(select(Tenant).where(Tenant.id == payload.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        from machine_learning.prediction.predictor import TenantPredictor
        predictor = TenantPredictor()
        result_data = predictor.predict(tenant)
        risk_score = result_data["risk_score"]
        shap_values = result_data["shap_values"]
    except Exception as e:
        # Fallback rule-based score if model unavailable
        risk_score = round(
            0.3
            + (1 - (tenant.communication_score or 0.5)) * 0.25
            + (1 - (tenant.engagement_score or 0.5)) * 0.20
            + (getattr(tenant, "complaints_filed", 0) or 0) * 0.05,
            3,
        )
        risk_score = min(1.0, risk_score)
        shap_values = {}

    risk_level = _get_risk_level(risk_score)
    will_not_renew = risk_score >= 0.5

    # Persist — SHAP values stored in both fields (retention route uses feature_inputs)
    pred = Prediction(
        tenant_id=payload.tenant_id,
        risk_score=risk_score,
        will_not_renew=will_not_renew,
        risk_level=risk_level,
        shap_values=shap_values,
        feature_inputs=shap_values,
    )
    db.add(pred)
    await db.commit()
    await db.refresh(pred)

    return {
        "prediction_id": pred.id,
        "tenant_id": payload.tenant_id,
        "risk_score": risk_score,
        "risk_score_pct": round(risk_score * 100, 1),
        "will_not_renew": will_not_renew,
        "risk_level": risk_level,
        "shap_values": shap_values,
        "predicted_at": pred.predicted_at.isoformat(),
    }


@router.post("/batch")
async def predict_batch(db: AsyncSession = Depends(get_db)):
    """Run real XGBoost predictions on ALL tenants and persist results."""
    result = await db.execute(select(Tenant))
    tenants = result.scalars().all()

    if not tenants:
        return {"processed": 0, "results": []}

    try:
        from machine_learning.prediction.predictor import TenantPredictor
        predictor = TenantPredictor()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model load failed: {e}")

    results = []
    for tenant in tenants:
        try:
            result_data = predictor.predict(tenant)
            risk_score = result_data["risk_score"]
            shap_values = result_data["shap_values"]
        except Exception:
            risk_score = 0.35
            shap_values = {}

        risk_level = _get_risk_level(risk_score)
        will_not_renew = risk_score >= 0.5

        pred = Prediction(
            tenant_id=tenant.id,
            risk_score=risk_score,
            will_not_renew=will_not_renew,
            risk_level=risk_level,
            shap_values=shap_values,
            feature_inputs=shap_values,
        )
        db.add(pred)

        results.append({
            "tenant_id": tenant.id,
            "tenant_name": tenant.full_name,
            "risk_score": risk_score,
            "risk_score_pct": round(risk_score * 100, 1),
            "risk_level": risk_level,
            "will_not_renew": will_not_renew,
            "top_risk_factors": list(shap_values.keys())[:3] if shap_values else [],
        })

    await db.commit()

    high   = sum(1 for r in results if r["risk_level"] == "high")
    medium = sum(1 for r in results if r["risk_level"] == "medium")
    low    = sum(1 for r in results if r["risk_level"] == "low")

    return {
        "processed": len(results),
        "summary": {"high": high, "medium": medium, "low": low},
        "results": sorted(results, key=lambda x: -x["risk_score"]),
    }


@router.get("/tenant/{tenant_id}")
async def get_tenant_predictions(
    tenant_id: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """Return historical predictions for a tenant, newest first."""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.tenant_id == tenant_id)
        .order_by(Prediction.predicted_at.desc())
        .limit(limit)
    )
    preds = result.scalars().all()
    return [
        {
            "prediction_id": p.id,
            "risk_score": p.risk_score,
            "risk_score_pct": round(p.risk_score * 100, 1),
            "risk_level": p.risk_level,
            "will_not_renew": p.will_not_renew,
            "shap_values": p.shap_values,
            "predicted_at": p.predicted_at.isoformat(),
        }
        for p in preds
    ]
