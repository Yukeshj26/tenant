"""
TenantSense AI — Synthetic Dataset Generator
Generates realistic tenant data for training the XGBoost prediction model.
Produces ~5,000 tenant records with behavioral and financial signals.
"""

import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from faker import Faker
import os

fake = Faker("en_IN")
random.seed(42)
np.random.seed(42)

# ─── Configuration ────────────────────────────────────────────────────────────
NUM_TENANTS = 5000
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "tenant_data.csv")
REFERENCE_DATE = datetime(2024, 7, 1)

PROPERTY_TYPES = ["Apartment", "Studio", "2BHK", "3BHK", "Commercial", "Villa"]
CITIES = ["Chennai", "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Kolkata"]
LANGUAGES = ["English", "Tamil", "Hindi", "Telugu", "Kannada"]
MAINTENANCE_TYPES = ["Plumbing", "Electrical", "AC", "Painting", "Pest Control", "General"]


def random_date(start: datetime, end: datetime) -> datetime:
    return start + timedelta(days=random.randint(0, (end - start).days))


def generate_payment_history(months: int, base_reliability: float) -> dict:
    """Generate payment statistics for a tenant over lease duration."""
    late_payments = 0
    missed_payments = 0
    avg_days_late = 0
    days_late_list = []

    for _ in range(months):
        roll = random.random()
        if roll < base_reliability:
            pass  # on time
        elif roll < base_reliability + 0.15:
            late = random.randint(1, 15)
            days_late_list.append(late)
            late_payments += 1
        else:
            missed_payments += 1
            days_late_list.append(random.randint(15, 45))

    avg_days_late = round(np.mean(days_late_list), 1) if days_late_list else 0.0
    payment_consistency = round(1 - (late_payments + missed_payments * 2) / (months + 1), 3)
    return {
        "late_payments": late_payments,
        "missed_payments": missed_payments,
        "avg_days_late": avg_days_late,
        "payment_consistency": max(0.0, min(1.0, payment_consistency)),
    }


def generate_tenant(tenant_id: int) -> dict:
    """Generate a single synthetic tenant record."""
    # Base risk tendency (hidden variable that drives non-renewal)
    risk_tendency = random.random()

    # ── Lease Info ────────────────────────────────────────────────────────
    lease_start = random_date(datetime(2021, 1, 1), datetime(2023, 6, 1))
    lease_duration_months = random.choice([6, 12, 24])
    lease_end = lease_start + timedelta(days=lease_duration_months * 30)
    days_to_expiry = (lease_end - REFERENCE_DATE).days

    # ── Demographics ──────────────────────────────────────────────────────
    city = random.choice(CITIES)
    property_type = random.choice(PROPERTY_TYPES)
    monthly_rent = random.randint(8000, 80000)
    preferred_language = random.choice(LANGUAGES)
    tenant_age = random.randint(22, 65)
    years_at_property = round((REFERENCE_DATE - lease_start).days / 365, 1)

    # ── Payment History ───────────────────────────────────────────────────
    base_reliability = max(0.2, 1.0 - risk_tendency * 0.6)
    payment_months = max(1, int((REFERENCE_DATE - lease_start).days / 30))
    payment = generate_payment_history(payment_months, base_reliability)

    # ── Maintenance ───────────────────────────────────────────────────────
    maint_freq = int(np.random.poisson(risk_tendency * 4 + 0.5))
    unresolved_issues = int(np.random.binomial(maint_freq, 0.3))
    avg_resolution_days = round(random.uniform(1, 14) + risk_tendency * 5, 1)

    # ── Engagement & Satisfaction ─────────────────────────────────────────
    # Lower engagement → higher risk
    engagement_score = round(max(0.0, min(1.0, 1.0 - risk_tendency + random.gauss(0, 0.15))), 3)
    satisfaction_score = round(max(1, min(10, 10 - risk_tendency * 7 + random.gauss(0, 1))), 1)
    complaints_filed = int(np.random.poisson(risk_tendency * 3))
    response_rate = round(max(0.0, min(1.0, 1.0 - risk_tendency * 0.5 + random.gauss(0, 0.1))), 3)
    portal_logins_last_30d = int(max(0, np.random.poisson((1 - risk_tendency) * 8)))
    communication_score = round(max(0.0, min(1.0, 1.0 - risk_tendency * 0.5 + random.gauss(0, 0.15))), 3)

    # ── Neighborhood & Market ─────────────────────────────────────────────
    rent_increase_pct = round(random.uniform(0, 15), 1)
    market_rent_ratio = round(random.uniform(0.7, 1.4), 3)  # tenant rent vs market
    nearby_vacancy_rate = round(random.uniform(0.02, 0.20), 3)

    # ── Sentiment (simulated NLP score from feedback) ─────────────────────
    sentiment_score = round(max(-1.0, min(1.0, 1.0 - risk_tendency * 1.8 + random.gauss(0, 0.3))), 3)

    # ── Target Label: will_not_renew ──────────────────────────────────────
    # Logistic-style probability incorporating multiple signals
    log_odds = (
        risk_tendency * 4.0
        - engagement_score * 2.0
        - payment["payment_consistency"] * 1.5
        - sentiment_score * 1.5
        + payment["missed_payments"] * 0.5
        + complaints_filed * 0.3
        + (rent_increase_pct / 15) * 1.0
        - satisfaction_score * 0.2
        + unresolved_issues * 0.4
        - 2.0  # intercept (bias toward renewal)
    )
    prob_non_renewal = 1 / (1 + np.exp(-log_odds))
    will_not_renew = int(np.random.binomial(1, prob_non_renewal))

    return {
        "tenant_id": f"T{tenant_id:05d}",
        "full_name": fake.name(),
        "email": fake.email(),
        "phone": fake.phone_number(),
        "city": city,
        "property_type": property_type,
        "preferred_language": preferred_language,
        "tenant_age": tenant_age,
        "lease_start_date": lease_start.strftime("%Y-%m-%d"),
        "lease_end_date": lease_end.strftime("%Y-%m-%d"),
        "lease_duration_months": lease_duration_months,
        "days_to_expiry": days_to_expiry,
        "years_at_property": years_at_property,
        "monthly_rent": monthly_rent,
        "rent_increase_pct": rent_increase_pct,
        "market_rent_ratio": market_rent_ratio,
        "nearby_vacancy_rate": nearby_vacancy_rate,
        "late_payments": payment["late_payments"],
        "missed_payments": payment["missed_payments"],
        "avg_days_late": payment["avg_days_late"],
        "payment_consistency": payment["payment_consistency"],
        "maintenance_requests": maint_freq,
        "unresolved_issues": unresolved_issues,
        "avg_resolution_days": avg_resolution_days,
        "engagement_score": engagement_score,
        "satisfaction_score": satisfaction_score,
        "complaints_filed": complaints_filed,
        "response_rate": response_rate,
        "portal_logins_last_30d": portal_logins_last_30d,
        "communication_score": communication_score,
        "sentiment_score": sentiment_score,
        "will_not_renew": will_not_renew,
    }


def main():
    print(f"🏗️  Generating {NUM_TENANTS} synthetic tenant records...")
    records = [generate_tenant(i + 1) for i in range(NUM_TENANTS)]
    df = pd.DataFrame(records)

    # ── Class balance check ───────────────────────────────────────────────
    renewal_rate = 1 - df["will_not_renew"].mean()
    print(f"✅ Renewal rate      : {renewal_rate:.1%}")
    print(f"❌ Non-renewal rate  : {df['will_not_renew'].mean():.1%}")
    print(f"📊 Total records     : {len(df)}")

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"💾 Saved to: {OUTPUT_CSV}")

    # ── Feature summary ───────────────────────────────────────────────────
    print("\n📈 Feature Summary:")
    numeric_cols = [
        "payment_consistency", "engagement_score", "satisfaction_score",
        "sentiment_score", "days_to_expiry", "maintenance_requests",
    ]
    print(df[numeric_cols].describe().round(3).to_string())


if __name__ == "__main__":
    main()
