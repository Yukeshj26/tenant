"""Retention strategies API — personalized recommendations per tenant."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from app.database.postgres import get_db
from app.models.tenant import Tenant
from app.models.prediction import Prediction

from app.core.config import settings
import google.generativeai as genai
from datetime import datetime

router = APIRouter()

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


class RetentionStrategy(BaseModel):
    category: str
    action: str
    priority: str
    estimated_impact: str


class RetentionResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    risk_level: str
    risk_score_pct: float
    strategies: List[RetentionStrategy]
    ai_message: Optional[str] = None
    generated_at: str


@router.get("/{tenant_id}", response_model=RetentionResponse)
async def get_retention_strategies(
    tenant_id: str,
    language: str = "en",
    db: AsyncSession = Depends(get_db),
):
    # Fetch tenant
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Fetch latest prediction
    pred_result = await db.execute(
        select(Prediction)
        .where(Prediction.tenant_id == tenant_id)
        .order_by(Prediction.predicted_at.desc())
        .limit(1)
    )
    prediction = pred_result.scalar_one_or_none()
    risk_level = prediction.risk_level if prediction else "medium"
    risk_score = prediction.risk_score if prediction else 0.5

    # Use SHAP values as feature importance signals (real model output)
    shap_values = prediction.shap_values if prediction else {}
    feature_inputs = prediction.feature_inputs if prediction else {}

    # Rule-based strategies using SHAP + tenant data
    strategies = _generate_rule_based_strategies(risk_level, shap_values, tenant)

    # LLM-enhanced message
    ai_message = await _generate_ai_message(tenant, risk_level, risk_score, shap_values, language)

    return RetentionResponse(
        tenant_id=tenant_id,
        tenant_name=tenant.full_name,
        risk_level=risk_level,
        risk_score_pct=round(risk_score * 100, 1),
        strategies=strategies,
        ai_message=ai_message,
        generated_at=datetime.utcnow().isoformat(),
    )


def _generate_rule_based_strategies(risk_level: str, shap_values: dict, tenant=None) -> List[RetentionStrategy]:
    """Generate rule-based strategies using SHAP values from the real XGBoost model.

    SHAP values are signed — positive = pushes toward churn (bad), negative = pushes toward renewal (good).
    We flag features with high positive SHAP contribution as risk drivers.
    """
    strategies = []

    # Payment consistency — SHAP key: "Payment Consistency Score"
    payment_shap = shap_values.get("Payment Consistency Score", 0)
    if payment_shap > 0.5:  # large positive = low score is hurting
        strategies.append(RetentionStrategy(
            category="Financial",
            action="Offer a flexible payment plan or grace period. Tenant shows low payment consistency — a structured plan reduces friction by ~20%.",
            priority="high",
            estimated_impact="Reduces late/missed payments, improves consistency score by ~20–30%",
        ))

    # Rent increase — SHAP key: "Rent Increase %"
    rent_shap = shap_values.get("Rent Increase %", 0)
    if rent_shap > 0.8:
        strategies.append(RetentionStrategy(
            category="Financial",
            action="Cap rent increase at 5% or offer a loyalty discount for early renewal. Model flagged high rent increase as a top churn driver.",
            priority="high",
            estimated_impact="Reduces price-sensitivity churn by ~30–35%",
        ))

    # Maintenance requests — SHAP key: "Maintenance Requests"
    maint_shap = shap_values.get("Maintenance Requests", 0)
    if maint_shap > 0.5:
        strategies.append(RetentionStrategy(
            category="Maintenance",
            action="Schedule an urgent property inspection. Resolve all open maintenance tickets within 7 days and follow up personally.",
            priority="high",
            estimated_impact="Improves maintenance satisfaction score by 1.5–2 points",
        ))

    # Survey / satisfaction — SHAP key: "Survey Score"
    survey_shap = shap_values.get("Survey Score", 0)
    if survey_shap > 0.5:
        strategies.append(RetentionStrategy(
            category="Experience",
            action="Arrange a personal one-on-one meeting to understand tenant concerns. Offer a goodwill gesture (e.g., one free parking month or utility waiver).",
            priority="medium",
            estimated_impact="Boosts tenant satisfaction by 1–2 points and signals you value their stay",
        ))

    # Complaint severity — SHAP key: "Complaint Severity Score"
    complaint_shap = shap_values.get("Complaint Severity Score", 0)
    if complaint_shap > 0.5:
        strategies.append(RetentionStrategy(
            category="Conflict Resolution",
            action="Assign a dedicated property manager to handle tenant complaints. Acknowledge existing issues formally with a resolution timeline.",
            priority="critical" if risk_level == "high" else "high",
            estimated_impact="Reduces complaint-driven churn by ~25%",
        ))

    # Previous renewals — SHAP key: "Previous Renewals" (negative SHAP = fewer renewals = higher risk)
    renewal_shap = shap_values.get("Previous Renewals", 0)
    if renewal_shap > 0.4:  # positive means lack of history is a churn signal
        strategies.append(RetentionStrategy(
            category="Loyalty Program",
            action="Introduce a renewal incentive — offer a rent freeze, property upgrade, or loyalty points for committing to another lease term.",
            priority="medium",
            estimated_impact="Long-term tenants are 40% less likely to churn with loyalty perks",
        ))

    # Portal engagement — SHAP key: "Portal Logins count"
    portal_shap = shap_values.get("Portal Logins count", 0)
    if portal_shap < -0.3:  # negative means low logins driving churn
        strategies.append(RetentionStrategy(
            category="Engagement",
            action="Send personalized portal onboarding guide. Low portal activity signals disengagement — invite tenant to community events or surveys.",
            priority="medium",
            estimated_impact="Active portal users are 20% more likely to renew",
        ))

    # High risk override — always add proactive outreach
    if risk_level == "high":
        strategies.append(RetentionStrategy(
            category="Proactive Outreach",
            action="Property manager to personally call tenant 90 days before lease expiry to discuss renewal terms and address any outstanding concerns.",
            priority="critical",
            estimated_impact="Early personal intervention reduces non-renewal probability by 35–40%",
        ))

    if not strategies:
        strategies.append(RetentionStrategy(
            category="Engagement",
            action="Send a warm renewal reminder with appreciation note 120 days before lease expiry. Tenant appears stable — maintain the relationship proactively.",
            priority="low",
            estimated_impact="Maintains positive relationship, low churn risk",
        ))

    return strategies


async def _generate_ai_message(tenant, risk_level, risk_score, shap_values: dict, language) -> Optional[str]:
    lang_names = {"en": "English", "ta": "Tamil", "hi": "Hindi"}
    lang_name = lang_names.get(language, "English")

    # Build a human-readable summary of the top risk drivers from SHAP values
    top_risk_drivers = []
    for feat, val in sorted(shap_values.items(), key=lambda x: -x[1])[:3]:
        if val > 0.3:
            top_risk_drivers.append(feat)

    risk_summary = ", ".join(top_risk_drivers) if top_risk_drivers else "general dissatisfaction"

    prompt = f"""You are a retention specialist at TenantSense AI.
Write a short (3-4 sentences), warm, personalized retention message for the property manager to send to this tenant.
Language: {lang_name}

Tenant: {tenant.full_name}
Risk Level: {risk_level} ({round(risk_score * 100, 1)}% predicted non-renewal probability)
Top AI-detected churn signals: {risk_summary}

Write in {lang_name}. Be warm, empathetic, not salesy. Focus on valuing their tenancy and addressing their specific concerns. Do not mention AI or predictions — write as if you care about this tenant personally.
"""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        return response.text
    except Exception:
        return None
