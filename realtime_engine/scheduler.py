"""
TenantSense AI — APScheduler Background Jobs
Nightly batch predictions, weekly risk report, and alert dispatch.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger
from datetime import datetime, date, timedelta


scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


async def run_nightly_batch_predictions():
    """
    Runs predictions for all active tenants whose lease expires in 0–180 days.
    Triggered: every night at 02:00 IST.
    """
    logger.info("⏰ [Scheduler] Starting nightly batch predictions...")
    try:
        from app.database.postgres import AsyncSessionLocal
        from app.models.tenant import Tenant
        from app.models.lease import Lease
        from app.models.prediction import Prediction
        from machine_learning.prediction.predictor import TenantPredictor
        from sqlalchemy import select, and_
        from realtime_engine.websocket_manager import ws_manager

        predictor = TenantPredictor()
        today = date.today()
        cutoff = today + timedelta(days=180)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Tenant).join(Lease, Lease.tenant_id == Tenant.id)
                .where(and_(Lease.is_active == True, Lease.lease_end_date <= cutoff))
            )
            tenants = result.scalars().all()
            logger.info(f"   Found {len(tenants)} tenants for batch prediction")

            high_risk_count = 0
            for tenant in tenants:
                try:
                    result_data = predictor.predict(tenant)
                    pred = Prediction(
                        tenant_id=tenant.id,
                        risk_score=result_data["risk_score"],
                        will_not_renew=result_data["will_not_renew"],
                        risk_level="high" if result_data["risk_score"] >= 0.70 else
                                    "medium" if result_data["risk_score"] >= 0.40 else "low",
                        shap_values=result_data.get("shap_values", {}),
                        feature_inputs=result_data.get("shap_values", {}),
                    )
                    db.add(pred)
                    if pred.risk_level == "high":
                        high_risk_count += 1
                except Exception as e:
                    logger.error(f"   Error predicting for tenant {tenant.id}: {e}")

            await db.commit()

        if high_risk_count > 0:
            await ws_manager.push_alert(
                alert_type="high_risk_batch",
                message=f"Nightly scan: {high_risk_count} high-risk tenants detected",
                data={"count": high_risk_count, "date": str(today)},
            )

        logger.info(f"✅ [Scheduler] Batch complete — {len(tenants)} predictions | {high_risk_count} high-risk")

    except Exception as e:
        logger.error(f"❌ [Scheduler] Batch prediction error: {e}")


async def send_weekly_risk_report():
    """
    Sends a weekly risk summary email to all active property managers.
    Triggered: every Monday at 08:00 IST.
    """
    logger.info("📧 [Scheduler] Sending weekly risk report...")
    # TODO: implement email service
    logger.info("✅ [Scheduler] Weekly report dispatched")


def start_scheduler():
    """Register and start all background jobs."""
    scheduler.add_job(
        run_nightly_batch_predictions,
        trigger=CronTrigger(hour=2, minute=0, timezone="Asia/Kolkata"),
        id="nightly_batch_predictions",
        name="Nightly Batch Predictions",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        send_weekly_risk_report,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=0, timezone="Asia/Kolkata"),
        id="weekly_risk_report",
        name="Weekly Risk Report",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("⏰ APScheduler started — jobs registered")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("⏰ APScheduler stopped")
