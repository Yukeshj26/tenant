"""Analytics API — dashboard KPIs, vacancy forecast, revenue forecast."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.database.postgres import get_db
from app.models.tenant import Tenant
from app.models.prediction import Prediction
from app.models.lease import Lease

from datetime import datetime, date, timedelta

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_kpis(db: AsyncSession = Depends(get_db)):
    """Main dashboard KPIs."""
    total_tenants = await db.scalar(select(func.count(Tenant.id)))

    # High-risk tenants (latest prediction per tenant with risk_level = high)
    high_risk = await db.scalar(
        select(func.count(Prediction.id))
        .where(Prediction.risk_level == "high")
        .where(Prediction.predicted_at >= datetime.utcnow() - timedelta(days=30))
    )

    # Avg risk score
    avg_risk = await db.scalar(
        select(func.avg(Prediction.risk_score))
        .where(Prediction.predicted_at >= datetime.utcnow() - timedelta(days=30))
    ) or 0.0

    # Non-renewal count
    non_renewal = await db.scalar(
        select(func.count(Prediction.id))
        .where(Prediction.will_not_renew == True)
        .where(Prediction.predicted_at >= datetime.utcnow() - timedelta(days=30))
    )

    # Leases expiring next 90 days
    today = date.today()
    expiring_soon = await db.scalar(
        select(func.count(Lease.id))
        .where(Lease.is_active == True)
        .where(Lease.lease_end_date <= today + timedelta(days=90))
        .where(Lease.lease_end_date >= today)
    )

    return {
        "total_tenants": total_tenants or 0,
        "high_risk_tenants": high_risk or 0,
        "avg_risk_score": round(float(avg_risk) * 100, 1),
        "predicted_non_renewals_30d": non_renewal or 0,
        "leases_expiring_90d": expiring_soon or 0,
        "retention_rate_pct": round((1 - (non_renewal or 0) / max(total_tenants or 1, 1)) * 100, 1),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/risk-distribution")
async def get_risk_distribution(db: AsyncSession = Depends(get_db)):
    """Risk level distribution for pie/donut chart."""
    result = await db.execute(
        select(Prediction.risk_level, func.count(Prediction.id).label("count"))
        .where(Prediction.predicted_at >= datetime.utcnow() - timedelta(days=30))
        .group_by(Prediction.risk_level)
    )
    rows = result.all()
    distribution = {row.risk_level: row.count for row in rows}
    return {
        "low": distribution.get("low", 0),
        "medium": distribution.get("medium", 0),
        "high": distribution.get("high", 0),
    }


@router.get("/vacancy-forecast")
async def get_vacancy_forecast(months: int = 6, db: AsyncSession = Depends(get_db)):
    """Vacancy projection based on actual predicted non-renewals and lease expiry data."""
    today = date.today()
    total_tenants = await db.scalar(select(func.count(Tenant.id))) or 1
    forecast = []

    for i in range(months):
        window_start = today + timedelta(days=30 * i)
        window_end = window_start + timedelta(days=30)

        # Count leases expiring in this month window
        expiring = await db.scalar(
            select(func.count(Lease.id))
            .where(Lease.is_active == True)
            .where(Lease.lease_end_date >= window_start)
            .where(Lease.lease_end_date < window_end)
        ) or 0

        # Count tenants predicted to not renew (high/medium risk from last 30d predictions)
        non_renewals = await db.scalar(
            select(func.count(Prediction.id))
            .where(Prediction.will_not_renew == True)
            .where(Prediction.predicted_at >= datetime.utcnow() - timedelta(days=30))
        ) or 0

        # Vacancy = expiring leases weighted by non-renewal rate
        non_renewal_rate = non_renewals / max(total_tenants, 1)
        predicted_vacancies = max(0, round(expiring * non_renewal_rate + i * non_renewal_rate))
        occupancy = round(max(0, (1 - predicted_vacancies / max(total_tenants, 1)) * 100), 1)

        forecast.append({
            "month": window_start.strftime("%b %Y"),
            "predicted_vacancies": predicted_vacancies,
            "leases_expiring": expiring,
            "non_renewal_rate_pct": round(non_renewal_rate * 100, 1),
            "occupancy_rate": occupancy,
        })

    return {"forecast": forecast, "forecast_months": months, "total_units": total_tenants}


@router.get("/revenue-forecast")
async def get_revenue_forecast(months: int = 6, db: AsyncSession = Depends(get_db)):
    """Revenue loss projection based on actual avg rent and real predicted non-renewals."""
    avg_rent_result = await db.scalar(select(func.avg(Lease.monthly_rent))) or 25000
    total_tenants = await db.scalar(select(func.count(Tenant.id))) or 1
    avg_rent = float(avg_rent_result)
    today = date.today()
    forecast = []
    cumulative = 0.0

    for i in range(months):
        window_start = today + timedelta(days=30 * i)
        window_end = window_start + timedelta(days=30)

        # Leases expiring this month
        expiring = await db.scalar(
            select(func.count(Lease.id))
            .where(Lease.is_active == True)
            .where(Lease.lease_end_date >= window_start)
            .where(Lease.lease_end_date < window_end)
        ) or 0

        # Non-renewal rate from latest model predictions
        non_renewals = await db.scalar(
            select(func.count(Prediction.id))
            .where(Prediction.will_not_renew == True)
            .where(Prediction.predicted_at >= datetime.utcnow() - timedelta(days=30))
        ) or 0
        non_renewal_rate = non_renewals / max(total_tenants, 1)

        vacant_units = max(0, round(expiring * non_renewal_rate + i * non_renewal_rate))
        revenue_loss = round(vacant_units * avg_rent, 2)
        cumulative += revenue_loss

        forecast.append({
            "month": window_start.strftime("%b %Y"),
            "predicted_vacant_units": vacant_units,
            "monthly_revenue_loss": revenue_loss,
            "cumulative_loss": round(cumulative, 2),
            "leases_expiring": expiring,
        })

    return {
        "forecast": forecast,
        "avg_monthly_rent": round(avg_rent, 2),
        "total_units": total_tenants,
    }
