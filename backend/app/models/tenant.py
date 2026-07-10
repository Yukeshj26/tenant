"""Tenant ORM model."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.postgres import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    property_type: Mapped[str] = mapped_column(String(50), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(20), default="English")
    tenant_age: Mapped[int] = mapped_column(Integer, nullable=True)

    # Engagement
    engagement_score: Mapped[float] = mapped_column(Float, default=0.5)
    satisfaction_score: Mapped[float] = mapped_column(Float, default=5.0)
    communication_score: Mapped[float] = mapped_column(Float, default=0.5)
    portal_logins_last_30d: Mapped[int] = mapped_column(Integer, default=0)
    response_rate: Mapped[float] = mapped_column(Float, default=0.5)
    complaints_filed: Mapped[int] = mapped_column(Integer, default=0)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    leases: Mapped[list["Lease"]] = relationship("Lease", back_populates="tenant", lazy="selectin")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="tenant", lazy="selectin")
    maintenance_requests: Mapped[list["MaintenanceRequest"]] = relationship("MaintenanceRequest", back_populates="tenant", lazy="selectin")
    predictions: Mapped[list["Prediction"]] = relationship("Prediction", back_populates="tenant", lazy="selectin")
