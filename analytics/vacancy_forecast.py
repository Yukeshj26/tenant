"""
TenantSense AI — Vacancy Forecasting
Produces a multi-month vacancy forecast using predicted non-renewals.
Uses simple trend extrapolation when Prophet is unavailable.
"""

import pandas as pd
import numpy as np
from datetime import date, timedelta
from typing import List, Optional


def generate_vacancy_forecast(
    current_vacancies: int,
    predicted_non_renewals_per_month: List[int],
    avg_fill_months: float = 2.0,
    total_units: int = 100,
) -> List[dict]:
    """
    Generate a month-by-month vacancy forecast.

    Args:
        current_vacancies: Current number of vacant units
        predicted_non_renewals_per_month: List of predicted non-renewals per upcoming month
        avg_fill_months: Average months to fill a vacant unit
        total_units: Total property units

    Returns:
        List of monthly forecast dicts
    """
    forecast = []
    vacancies = current_vacancies

    for i, new_non_renewals in enumerate(predicted_non_renewals_per_month):
        month_date = date.today() + timedelta(days=30 * i)

        # Add new vacancies from predicted non-renewals
        vacancies += new_non_renewals

        # Subtract units expected to be filled this month
        filled_this_month = vacancies / max(avg_fill_months, 1)
        vacancies = max(0, vacancies - filled_this_month)

        occupancy_rate = round(((total_units - vacancies) / total_units) * 100, 2)

        forecast.append({
            "month": month_date.strftime("%b %Y"),
            "month_index": i + 1,
            "new_non_renewals": new_non_renewals,
            "predicted_vacancies": round(vacancies, 1),
            "occupancy_rate": occupancy_rate,
            "vacancy_rate": round(100 - occupancy_rate, 2),
        })

    return forecast


def forecast_with_trend(
    historical_vacancy_rates: List[float],
    forecast_months: int = 6,
    total_units: int = 100,
) -> List[dict]:
    """
    Simple linear-trend vacancy forecast from historical data.
    Falls back gracefully if insufficient data.
    """
    if len(historical_vacancy_rates) < 2:
        # Flat forecast
        rate = historical_vacancy_rates[0] if historical_vacancy_rates else 5.0
        today = date.today()
        return [
            {
                "month": (today + timedelta(days=30 * i)).strftime("%b %Y"),
                "predicted_vacancy_rate": round(rate, 2),
                "predicted_vacancies": round(total_units * rate / 100, 1),
                "occupancy_rate": round(100 - rate, 2),
            }
            for i in range(forecast_months)
        ]

    # Linear regression on historical data
    x = np.arange(len(historical_vacancy_rates))
    y = np.array(historical_vacancy_rates)
    slope, intercept = np.polyfit(x, y, 1)

    today = date.today()
    forecast = []
    for i in range(forecast_months):
        future_x = len(historical_vacancy_rates) + i
        predicted_rate = max(0, min(100, intercept + slope * future_x))
        forecast.append({
            "month": (today + timedelta(days=30 * i)).strftime("%b %Y"),
            "predicted_vacancy_rate": round(predicted_rate, 2),
            "predicted_vacancies": round(total_units * predicted_rate / 100, 1),
            "occupancy_rate": round(100 - predicted_rate, 2),
        })

    return forecast
