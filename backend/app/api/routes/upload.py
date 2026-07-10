"""File upload API — CSV bulk import + lease agreement uploads."""

import os
import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database.postgres import get_db
from app.models.tenant import Tenant
from app.models.lease import Lease

import pandas as pd
import io

router = APIRouter()

# ─── Upload directory ─────────────────────────────────────────────────────────
# upload.py lives at backend/app/api/routes/ → parents[3] = backend/
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"
LEASE_UPLOAD_DIR = UPLOAD_DIR / "leases"
LEASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_LEASE_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_LEASE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"}

REQUIRED_COLUMNS = {
    "full_name", "email", "city", "property_type",
    "preferred_language", "engagement_score", "satisfaction_score",
}


# ─── CSV Upload ───────────────────────────────────────────────────────────────
@router.post("/tenants/csv")
async def upload_tenants_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse CSV file")

    missing = REQUIRED_COLUMNS - set(df.columns.str.lower())
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing columns: {', '.join(missing)}")

    df.columns = df.columns.str.lower()
    created = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            tenant = Tenant(
                tenant_code=f"T{str(uuid.uuid4())[:6].upper()}",
                full_name=str(row.get("full_name", "")),
                email=str(row.get("email", f"tenant_{idx}@import.local")),
                phone=str(row.get("phone", "")) or None,
                city=str(row.get("city", "")) or None,
                property_type=str(row.get("property_type", "Apartment")),
                preferred_language=str(row.get("preferred_language", "English")),
                tenant_age=int(row.get("tenant_age", 30)) if pd.notna(row.get("tenant_age")) else None,
                engagement_score=float(row.get("engagement_score", 0.5)),
                satisfaction_score=float(row.get("satisfaction_score", 5.0)),
                communication_score=float(row.get("communication_score", 0.5)),
                sentiment_score=float(row.get("sentiment_score", 0.0)) if pd.notna(row.get("sentiment_score")) else 0.0,
            )
            db.add(tenant)
            created += 1
        except Exception as e:
            errors.append({"row": idx + 2, "error": str(e)})

    await db.commit()

    return {
        "message": f"CSV processed: {created} tenants imported",
        "created": created,
        "errors": errors[:10],
        "total_rows": len(df),
    }


# ─── Lease Agreement Upload ───────────────────────────────────────────────────
@router.post("/lease-agreement/{tenant_id}")
async def upload_lease_agreement(
    tenant_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a lease agreement document for a tenant's active lease."""
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_LEASE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX"
        )

    # Validate content type
    if file.content_type and file.content_type not in ALLOWED_LEASE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file content type")

    # Check tenant exists
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Find active lease
    lease_result = await db.execute(
        select(Lease).where(Lease.tenant_id == tenant_id, Lease.is_active == True)
    )
    lease = lease_result.scalar_one_or_none()
    if not lease:
        raise HTTPException(
            status_code=404,
            detail="No active lease found for this tenant. Please create a lease first."
        )

    # Delete old file if exists
    if lease.agreement_path and Path(lease.agreement_path).exists():
        Path(lease.agreement_path).unlink(missing_ok=True)

    # Save new file with a unique filename
    safe_filename = f"{tenant_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = LEASE_UPLOAD_DIR / safe_filename

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update lease record
    lease.agreement_path = str(file_path)
    await db.commit()

    file_size_kb = round(len(contents) / 1024, 1)

    return {
        "message": "Lease agreement uploaded successfully",
        "tenant_id": tenant_id,
        "lease_id": lease.id,
        "filename": file.filename,
        "saved_as": safe_filename,
        "file_size_kb": file_size_kb,
        "content_type": file.content_type,
    }


@router.get("/lease-agreement/{tenant_id}")
async def get_lease_agreement_info(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get lease agreement info for a tenant."""
    lease_result = await db.execute(
        select(Lease).where(Lease.tenant_id == tenant_id, Lease.is_active == True)
    )
    lease = lease_result.scalar_one_or_none()
    if not lease:
        raise HTTPException(status_code=404, detail="No active lease found")

    if not lease.agreement_path:
        return {"has_agreement": False, "lease_id": lease.id}

    file_path = Path(lease.agreement_path)
    if not file_path.exists():
        return {"has_agreement": False, "lease_id": lease.id, "note": "File missing on disk"}

    stat = file_path.stat()
    return {
        "has_agreement": True,
        "lease_id": lease.id,
        "filename": file_path.name,
        "file_size_kb": round(stat.st_size / 1024, 1),
        "download_url": f"/api/v1/upload/lease-agreement/download/{tenant_id}",
    }


@router.get("/lease-agreement/download/{tenant_id}")
async def download_lease_agreement(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Download/view the lease agreement for a tenant."""
    lease_result = await db.execute(
        select(Lease).where(Lease.tenant_id == tenant_id, Lease.is_active == True)
    )
    lease = lease_result.scalar_one_or_none()
    if not lease or not lease.agreement_path:
        raise HTTPException(status_code=404, detail="No lease agreement found")

    file_path = Path(lease.agreement_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )


@router.delete("/lease-agreement/{tenant_id}")
async def delete_lease_agreement(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete the lease agreement for a tenant."""
    lease_result = await db.execute(
        select(Lease).where(Lease.tenant_id == tenant_id, Lease.is_active == True)
    )
    lease = lease_result.scalar_one_or_none()
    if not lease:
        raise HTTPException(status_code=404, detail="No active lease found")

    if lease.agreement_path:
        Path(lease.agreement_path).unlink(missing_ok=True)
        lease.agreement_path = None
        await db.commit()

    return {"message": "Lease agreement deleted successfully"}


