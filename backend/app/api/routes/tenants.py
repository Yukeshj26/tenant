"""Tenants API routes — CRUD operations."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
import uuid

from app.database.postgres import get_db
from app.models.tenant import Tenant


router = APIRouter()


class TenantCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    city: Optional[str] = None
    property_type: Optional[str] = None
    preferred_language: str = "English"
    tenant_age: Optional[int] = None
    engagement_score: float = 0.5
    satisfaction_score: float = 5.0
    communication_score: float = 0.5


class TenantUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    preferred_language: Optional[str] = None
    engagement_score: Optional[float] = None
    satisfaction_score: Optional[float] = None
    communication_score: Optional[float] = None
    sentiment_score: Optional[float] = None
    portal_logins_last_30d: Optional[int] = None


class TenantSenseFormSubmit(BaseModel):
    formRef: str
    filedDate: str
    tenantName: str
    age: int
    gender: str
    contact: str
    email: EmailStr
    occupation: str
    income: float
    idType: str
    idNumber: str
    leaseAmount: float
    deposit: float
    startDate: str
    duration: str
    endDate: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: int
    propertyType: str
    location: Optional[str] = None
    ecName: str
    ecRelation: str
    ecNumber: str
    occupants: int
    pets: str
    parking: str
    specialReq: Optional[str] = None
    aiConsent: bool


@router.get("/")
async def list_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    city: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Tenant)
    if search:
        query = query.where(Tenant.full_name.ilike(f"%{search}%") | Tenant.email.ilike(f"%{search}%"))
    if city:
        query = query.where(Tenant.city == city)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit))
    tenants = result.scalars().all()

    return {"total": total, "tenants": [_tenant_to_dict(t) for t in tenants], "skip": skip, "limit": limit}


@router.post("/", status_code=201)
async def create_tenant(payload: TenantCreate, db: AsyncSession = Depends(get_db)):
    tenant = Tenant(
        tenant_code=f"T{str(uuid.uuid4())[:6].upper()}",
        **payload.model_dump(),
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return _tenant_to_dict(tenant)


@router.post("/register-form", status_code=201)
async def register_tenant_form(
    payload: TenantSenseFormSubmit,
    db: AsyncSession = Depends(get_db)
):
    from app.database.mongodb import get_collection
    from app.models.lease import Lease
    from datetime import datetime, date
    import uuid

    # 1. Store in MongoDB
    doc = payload.model_dump()
    mongo_id = str(uuid.uuid4())
    doc["_id"] = mongo_id
    doc["submitted_at"] = datetime.utcnow()
    
    try:
        coll = get_collection("tenant_registrations")
        await coll.insert_one(doc)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"MongoDB error: Failed to store tenant registration. Details: {str(e)}"
        )

    # 2. Try to sync to PostgreSQL (gracefully)
    pg_tenant_id = None
    pg_created = False
    try:
        # Check if tenant already exists by email
        result = await db.execute(select(Tenant).where(Tenant.email == payload.email))
        existing_tenant = result.scalar_one_or_none()

        if existing_tenant:
            pg_tenant_id = existing_tenant.id
            existing_tenant.full_name = payload.tenantName
            existing_tenant.phone = payload.contact
            existing_tenant.city = payload.city
            existing_tenant.property_type = payload.propertyType
            existing_tenant.tenant_age = payload.age
            await db.commit()
        else:
            # Create a new tenant in Postgres
            new_tenant = Tenant(
                id=str(uuid.uuid4()),
                tenant_code=f"T{str(uuid.uuid4())[:6].upper()}",
                full_name=payload.tenantName,
                email=payload.email,
                phone=payload.contact,
                city=payload.city,
                property_type=payload.propertyType,
                tenant_age=payload.age,
                preferred_language="English"
            )
            db.add(new_tenant)
            await db.commit()
            pg_tenant_id = new_tenant.id
            pg_created = True

        # Now check if we can create a corresponding Lease in Postgres
        if pg_tenant_id:
            try:
                start_dt = date.fromisoformat(payload.startDate)
                end_dt = date.fromisoformat(payload.endDate) if payload.endDate else start_dt
                duration_m = int(payload.duration)
            except ValueError:
                start_dt = date.today()
                end_dt = date.today()
                duration_m = 12

            # Create corresponding Lease record in Postgres
            new_lease = Lease(
                id=str(uuid.uuid4()),
                tenant_id=pg_tenant_id,
                lease_start_date=start_dt,
                lease_end_date=end_dt,
                lease_duration_months=duration_m,
                monthly_rent=payload.leaseAmount,
                is_active=True
            )
            db.add(new_lease)
            await db.commit()

    except Exception as pg_err:
        from loguru import logger
        logger.warning(f"Failed to sync tenant form submission to PostgreSQL: {pg_err}")

    return {
        "status": "success",
        "message": "Tenant registration details saved to MongoDB successfully",
        "mongodb_id": mongo_id,
        "postgres_sync": {
            "synced": pg_tenant_id is not None,
            "created_new_tenant": pg_created,
            "tenant_id": pg_tenant_id
        }
    }


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return _tenant_to_dict(tenant)


@router.patch("/{tenant_id}")
async def update_tenant(
    tenant_id: str, payload: TenantUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)
    await db.commit()
    await db.refresh(tenant)
    return _tenant_to_dict(tenant)


@router.delete("/{tenant_id}", status_code=204)
async def delete_tenant(tenant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await db.delete(tenant)
    await db.commit()


def _tenant_to_dict(t: Tenant) -> dict:
    return {
        "id": t.id,
        "tenant_code": t.tenant_code,
        "full_name": t.full_name,
        "email": t.email,
        "phone": t.phone,
        "city": t.city,
        "property_type": t.property_type,
        "preferred_language": t.preferred_language,
        "tenant_age": t.tenant_age,
        "engagement_score": t.engagement_score,
        "satisfaction_score": t.satisfaction_score,
        "communication_score": t.communication_score,
        "sentiment_score": t.sentiment_score,
        "portal_logins_last_30d": t.portal_logins_last_30d,
        "created_at": t.created_at.isoformat(),
    }
