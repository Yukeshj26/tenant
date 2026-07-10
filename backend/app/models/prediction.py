"""Prediction ORM model — stores ML prediction results and SHAP values."""
import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.postgres import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)           # 0.0 – 1.0
    will_not_renew: Mapped[bool] = mapped_column(Boolean, nullable=False)      # threshold prediction
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)        # low / medium / high
    shap_values: Mapped[dict] = mapped_column(JSON, nullable=True)             # feature: shap_value
    feature_inputs: Mapped[dict] = mapped_column(JSON, nullable=True)          # raw feature dict
    model_version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    predicted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="predictions")
