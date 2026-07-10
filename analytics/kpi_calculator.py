"""
TenantSense AI — KPI Calculator
Computes core property management KPIs from prediction and tenant data.
"""

from typing import Optional


def calculate_occupancy_rate(total_units: int, vacant_units: int) -> float:
    """Occupancy rate as a percentage."""
    if total_units == 0:
        return 0.0
    return round(((total_units - vacant_units) / total_units) * 100, 2)


def calculate_churn_rate(non_renewals: int, total_expiring: int) -> float:
    """Churn rate = non-renewals / total expiring leases."""
    if total_expiring == 0:
        return 0.0
    return round((non_renewals / total_expiring) * 100, 2)


def calculate_retention_rate(renewals: int, total_expiring: int) -> float:
    """Retention rate = renewals / total expiring leases."""
    return round(100 - calculate_churn_rate(total_expiring - renewals, total_expiring), 2)


def calculate_revenue_at_risk(
    high_risk_count: int,
    avg_monthly_rent: float,
    avg_vacancy_duration_months: float = 2.0,
) -> dict:
    """
    Revenue at risk from predicted non-renewals.
    Includes direct rent loss + estimated re-leasing cost.
    """
    direct_loss = high_risk_count * avg_monthly_rent * avg_vacancy_duration_months
    reletting_cost = high_risk_count * avg_monthly_rent * 0.5  # broker fee estimate
    total_risk = direct_loss + reletting_cost
    return {
        "high_risk_tenants": high_risk_count,
        "avg_monthly_rent": round(avg_monthly_rent, 2),
        "avg_vacancy_months": avg_vacancy_duration_months,
        "direct_revenue_loss": round(direct_loss, 2),
        "reletting_cost_estimate": round(reletting_cost, 2),
        "total_revenue_at_risk": round(total_risk, 2),
    }


def calculate_avg_lease_duration(lease_durations_months: list) -> float:
    """Average lease duration across all tenants."""
    if not lease_durations_months:
        return 0.0
    return round(sum(lease_durations_months) / len(lease_durations_months), 2)


def calculate_risk_score_trend(historical_scores: list) -> dict:
    """
    Compute trend from a time-series of avg risk scores.
    Returns: direction (up/down/stable), delta, pct_change
    """
    if len(historical_scores) < 2:
        return {"direction": "stable", "delta": 0.0, "pct_change": 0.0}

    latest = historical_scores[-1]
    previous = historical_scores[-2]
    delta = round(latest - previous, 4)
    pct_change = round((delta / max(previous, 0.001)) * 100, 2)

    if delta > 0.02:
        direction = "up"       # worsening
    elif delta < -0.02:
        direction = "down"     # improving
    else:
        direction = "stable"

    return {"direction": direction, "delta": delta, "pct_change": pct_change}
