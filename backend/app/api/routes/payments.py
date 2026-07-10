"""Payments API routes — CRUD operations."""

from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
import uuid

from sqlalchemy.orm import selectinload
from app.database.postgres import get_db
from app.models.payment import Payment
from app.models.tenant import Tenant


router = APIRouter()


class PaymentCreate(BaseModel):
    tenant_id: str
    due_date: date
    amount_due: float
    amount_paid: float = 0.0
    paid_date: Optional[date] = None
    is_missed: bool = False
    days_late: int = 0


class PaymentUpdate(BaseModel):
    due_date: Optional[date] = None
    amount_due: Optional[float] = None
    amount_paid: Optional[float] = None
    paid_date: Optional[date] = None
    is_missed: Optional[bool] = None
    days_late: Optional[int] = None


class RecordPaymentRequest(BaseModel):
    amount_paid: float
    paid_date: date


@router.get("/")
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    tenant_id: Optional[str] = None,
    status: Optional[str] = None, # "paid", "unpaid", "late", "missed"
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment).join(Tenant, Tenant.id == Payment.tenant_id).options(selectinload(Payment.tenant))
    
    if tenant_id:
        query = query.where(Payment.tenant_id == tenant_id)
        
    if search:
        query = query.where(Tenant.full_name.ilike(f"%{search}%") | Tenant.email.ilike(f"%{search}%"))

    if status:
        status_lower = status.lower()
        if status_lower == "paid":
            query = query.where(Payment.amount_paid >= Payment.amount_due).where(Payment.is_missed == False)
        elif status_lower == "unpaid":
            query = query.where(Payment.amount_paid < Payment.amount_due).where(Payment.paid_date == None).where(Payment.is_missed == False)
        elif status_lower == "late":
            query = query.where(Payment.paid_date != None).where(Payment.days_late > 0)
        elif status_lower == "missed":
            query = query.where(Payment.is_missed == True)

    query = query.order_by(desc(Payment.due_date))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit))
    payments = result.scalars().all()

    return {
        "total": total,
        "payments": [_payment_to_dict(p) for p in payments],
        "skip": skip,
        "limit": limit
    }


@router.post("/", status_code=201)
async def create_payment(payload: PaymentCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == payload.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    payment = Payment(
        id=str(uuid.uuid4()),
        **payload.model_dump()
    )
    db.add(payment)
    await db.commit()
    
    # Reload with tenant eagerly loaded for serialization
    stmt = select(Payment).where(Payment.id == payment.id).options(selectinload(Payment.tenant))
    res = await db.execute(stmt)
    return _payment_to_dict(res.scalar_one())


@router.get("/{payment_id}")
async def get_payment(payment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Payment).where(Payment.id == payment_id).options(selectinload(Payment.tenant)))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return _payment_to_dict(payment)


@router.patch("/{payment_id}")
async def update_payment(
    payment_id: str, payload: PaymentUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Payment).where(Payment.id == payment_id).options(selectinload(Payment.tenant)))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(payment, field, value)
    
    await db.commit()
    await db.refresh(payment)
    return _payment_to_dict(payment)


@router.post("/{payment_id}/pay")
async def record_payment_transaction(
    payment_id: str, payload: RecordPaymentRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Payment).where(Payment.id == payment_id).options(selectinload(Payment.tenant)))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    payment.amount_paid = payload.amount_paid
    payment.paid_date = payload.paid_date
    
    if payment.paid_date > payment.due_date:
        delta = payment.paid_date - payment.due_date
        payment.days_late = delta.days
    else:
        payment.days_late = 0
        
    payment.is_missed = False

    await db.commit()
    await db.refresh(payment)
    return _payment_to_dict(payment)


@router.delete("/{payment_id}", status_code=204)
async def delete_payment(payment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    await db.delete(payment)
    await db.commit()


def _payment_to_dict(p: Payment) -> dict:
    return {
        "id": p.id,
        "tenant_id": p.tenant_id,
        "tenant_name": p.tenant.full_name if p.tenant else "Unknown Tenant",
        "due_date": p.due_date.isoformat(),
        "paid_date": p.paid_date.isoformat() if p.paid_date else None,
        "amount_due": p.amount_due,
        "amount_paid": p.amount_paid,
        "days_late": p.days_late,
        "is_missed": p.is_missed,
        "created_at": p.created_at.isoformat()
    }
