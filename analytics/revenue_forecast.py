"""
TenantSense AI — Revenue Forecasting
Projects monthly and cumulative revenue loss from predicted vacancies.
"""

from typing import List
from datetime import date, timedelta


def generate_revenue_forecast(
    vacancy_forecast: List[dict],
    avg_monthly_rent: float = 25000.0,
    reletting_cost_per_unit: Optional[float] = None,
) -> List[dict]:
    """
    Generates a revenue loss forecast from a vacancy forecast.

    Args:
        vacancy_forecast: Output from vacancy_forecast.generate_vacancy_forecast()
        avg_monthly_rent: Average monthly rent per unit (INR)
        reletting_cost_per_unit: One-time cost to re-let a unit (default: 50% of monthly rent)

    Returns:
        List of monthly revenue forecast dicts
    """
    from typing import Optional
    if reletting_cost_per_unit is None:
        reletting_cost_per_unit = avg_monthly_rent * 0.5

    cumulative_loss = 0.0
    result = []

    for entry in vacancy_forecast:
        vacant_units = entry.get("predicted_vacancies", 0)
        new_non_renewals = entry.get("new_non_renewals", 0)

        monthly_rent_loss = vacant_units * avg_monthly_rent
        monthly_reletting_cost = new_non_renewals * reletting_cost_per_unit
        monthly_total_loss = monthly_rent_loss + monthly_reletting_cost
        cumulative_loss += monthly_total_loss

        result.append({
            "month": entry["month"],
            "vacant_units": vacant_units,
            "monthly_rent_loss": round(monthly_rent_loss, 2),
            "reletting_cost": round(monthly_reletting_cost, 2),
            "total_monthly_loss": round(monthly_total_loss, 2),
            "cumulative_loss": round(cumulative_loss, 2),
            "projected_revenue": round(max(0, avg_monthly_rent * 100 - monthly_total_loss), 2),
        })

    return result


def calculate_break_even_retention(
    at_risk_tenants: int,
    avg_monthly_rent: float,
    retention_campaign_cost: float,
    avg_vacancy_months: float = 2.0,
) -> dict:
    """
    Calculates the ROI of a retention campaign vs. cost of vacancies.
    """
    cost_of_vacancies = at_risk_tenants * avg_monthly_rent * avg_vacancy_months
    roi = round(((cost_of_vacancies - retention_campaign_cost) / max(retention_campaign_cost, 1)) * 100, 2)
    break_even_rate = round(retention_campaign_cost / max(cost_of_vacancies, 1) * 100, 2)

    return {
        "at_risk_tenants": at_risk_tenants,
        "estimated_vacancy_cost": round(cost_of_vacancies, 2),
        "retention_campaign_cost": round(retention_campaign_cost, 2),
        "estimated_roi_pct": roi,
        "break_even_retention_rate_pct": break_even_rate,
        "recommended": roi > 0,
    }


# Optional type hint fix
from typing import Optional  # noqa
