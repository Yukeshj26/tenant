"""Lease ORM model."""
import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.postgres import Base


class Lease(Base):
    __tablename__ = "leases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    lease_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    lease_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    lease_duration_months: Mapped[int] = mapped_column(Integer, nullable=False)
    monthly_rent: Mapped[float] = mapped_column(Float, nullable=False)
    rent_increase_pct: Mapped[float] = mapped_column(Float, default=0.0)
    market_rent_ratio: Mapped[float] = mapped_column(Float, default=1.0)
    nearby_vacancy_rate: Mapped[float] = mapped_column(Float, default=0.05)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    agreement_path: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="leases")
