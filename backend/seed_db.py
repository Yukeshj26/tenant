"""
TenantSense AI — Database Seeding Script
Populates the database with the default admin user and initial tenant records from the generated synthetic dataset.
"""

import asyncio
import os
import sys
import pandas as pd
from datetime import datetime, date, timedelta
import random

# Add backend directory to sys.path
BACKEND_ROOT = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BACKEND_ROOT)

from app.database.postgres import get_db, AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.models.lease import Lease
from app.models.payment import Payment
from app.models.maintenance import MaintenanceRequest
from app.models.prediction import Prediction
from app.authentication.auth import get_password_hash
from app.core.config import settings

PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_ROOT, ".."))
CSV_PATH = os.path.join(PROJECT_ROOT, "datasets", "tenant_data.csv")


async def seed():
    # Ensure tables are created
    await init_db()

    async with AsyncSessionLocal() as db:
        # 1. Seed Admin User
        admin_email = "admin@tenantsense.ai"
        # Direct SQLAlchemy selection
        from sqlalchemy import select
        admin_query = await db.execute(select(User).where(User.email == admin_email))
        admin = admin_query.scalar_one_or_none()

        if not admin:
            print("[User] Seeding default admin user...")
            admin = User(
                email=admin_email,
                full_name="Admin User",
                hashed_password=get_password_hash("demo123"),
                role=UserRole.ADMIN,
                is_active=True,
                preferred_language="en"
            )
            db.add(admin)
            await db.commit()
            print("[SUCCESS] Default admin user created successfully!")
        else:
            print("[INFO] Admin user already exists.")

        # 2. Seed Tenants from CSV (limit to 100 for fast seeding)
        if not os.path.exists(CSV_PATH):
            print(f"[WARNING] Synthetic data CSV not found at {CSV_PATH}. Please run synthetic data generator first.")
            return

        # Check if --clean is in command arguments
        clean_db = "--clean" in sys.argv or "-c" in sys.argv
        if clean_db:
            print("[CLEAN] Cleaning existing tenant, lease, payment, prediction, and maintenance data...")
            from sqlalchemy import text
            await db.execute(text("TRUNCATE TABLE predictions, maintenance_requests, payments, leases, tenants CASCADE;"))
            await db.commit()
            print("[CLEAN] Database cleaned successfully!")

        # Check if tenants already seeded
        if not clean_db:
            tenant_query = await db.execute(select(Tenant).limit(1))
            if tenant_query.scalar_one_or_none():
                print("[INFO] Tenants already exist in the database. Skipping synthetic data seeding.")
                return

        print("[LOAD] Seeding tenants from synthetic CSV...")
        df = pd.read_csv(CSV_PATH)
        seed_limit = min(100, len(df))
        records_to_seed = df.head(seed_limit)

        for idx, row in records_to_seed.iterrows():
            tenant = Tenant(
                tenant_code=row.get("tenant_code", f"T{idx:05d}"),
                full_name=row.get("full_name", f"Tenant {idx}"),
                email=row.get("email", f"tenant_{idx}@example.com"),
                phone=str(row.get("phone", "+91 98765 43210")),
                city=row.get("city", "Chennai"),
                property_type=row.get("property_type", "2BHK"),
                preferred_language=row.get("preferred_language", "English"),
                tenant_age=int(row.get("tenant_age", 30)),
                engagement_score=float(row.get("engagement_score", 0.5)),
                satisfaction_score=float(row.get("satisfaction_score", 5.0)),
                communication_score=float(row.get("communication_score", 0.5)),
                portal_logins_last_30d=int(row.get("portal_logins_last_30d", 2)),
                response_rate=float(row.get("response_rate", 0.5)),
                complaints_filed=int(row.get("complaints_filed", 0)),
                sentiment_score=float(row.get("sentiment_score", 0.0))
            )
            db.add(tenant)
            await db.flush() # populate tenant.id

            # Seed Lease with randomized rent (range: 12k to 45k)
            monthly_rent = float(random.randint(12, 45) * 1000)
            days_to_exp = int(row.get("days_to_expiry", 180))
            lease_end = date.today() + timedelta(days=days_to_exp)
            lease_start = lease_end - timedelta(days=365) # 1 year duration
            lease = Lease(
                tenant_id=tenant.id,
                lease_start_date=lease_start,
                lease_end_date=lease_end,
                lease_duration_months=12,
                monthly_rent=monthly_rent,
                rent_increase_pct=float(row.get("rent_increase_pct", 5.0)),
                market_rent_ratio=float(row.get("market_rent_ratio", 1.0)),
                nearby_vacancy_rate=float(row.get("nearby_vacancy_rate", 0.05)),
                is_active=True
            )
            db.add(lease)

            # Seed Payments
            late_payments = int(row.get("late_payments", 0))
            missed_payments = int(row.get("missed_payments", 0))
            avg_days_late = float(row.get("avg_days_late", 0.0))

            # Simulate recent payments
            for m in range(1, 13):
                p_due_date = lease_start + timedelta(days=30 * m)
                p_is_missed = False
                p_days_late = 0
                amount_paid = monthly_rent

                if m <= missed_payments:
                    p_is_missed = True
                    amount_paid = 0.0
                else:
                    if m <= missed_payments + late_payments:
                        p_days_late = int(avg_days_late) if avg_days_late > 0 else random.randint(1, 15)
                    elif random.random() < 0.15: # 15% chance of minor random lateness
                        p_days_late = random.randint(1, 4)

                    # Introduce minor partial payments (10% chance underpaid slightly)
                    if random.random() < 0.1:
                        amount_paid = monthly_rent - float(random.choice([500, 1000, 1500]))

                payment = Payment(
                    tenant_id=tenant.id,
                    due_date=p_due_date,
                    paid_date=None if p_is_missed else (p_due_date + timedelta(days=p_days_late)),
                    amount_due=monthly_rent,
                    amount_paid=amount_paid,
                    days_late=p_days_late,
                    is_missed=p_is_missed
                )
                db.add(payment)

            # Seed Maintenance requests
            maintenance_count = int(row.get("maintenance_requests", 0))
            unresolved = int(row.get("unresolved_issues", 0))
            for i in range(maintenance_count):
                is_unresolved = (i < unresolved)
                raised = lease_start + timedelta(days=random.randint(10, 300))
                resolved = None if is_unresolved else (raised + timedelta(days=random.randint(1, 14)))
                req = MaintenanceRequest(
                    tenant_id=tenant.id,
                    issue_type=random.choice(["Plumbing", "Electrical", "AC", "Pest Control", "General"]),
                    description="Service requested",
                    priority=random.choice(["low", "medium", "high"]),
                    status="open" if is_unresolved else "resolved",
                    raised_date=raised,
                    resolved_date=resolved,
                    resolution_days=0.0 if is_unresolved else float((resolved - raised).days),
                    is_resolved=not is_unresolved
                )
                db.add(req)

        await db.commit()
        print(f"[SUCCESS] Successfully seeded {seed_limit} tenants with leases, payments, and maintenance requests!")


if __name__ == "__main__":
    asyncio.run(seed())
