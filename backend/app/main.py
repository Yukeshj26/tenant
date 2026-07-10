"""
TenantSense AI — FastAPI Application Entry Point
"""

import sys
import os

# Ensure project root is on sys.path so `machine_learning` package is importable
# main.py lives at <project>/backend/app/main.py → project root is 2 dirs up
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.database.postgres import init_db
from app.api.routes import tenants, predictions, analytics, chatbot, retention, upload, payments
from app.core.config import settings


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 TenantSense AI Backend starting up...")
    await init_db()
    logger.info("✅ Database initialized")
    yield
    logger.info("🛑 TenantSense AI Backend shutting down...")


# ─── App Instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="TenantSense AI API",
    description="AI-powered lease renewal prediction and tenant retention platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    logger.info(f"{request.method} {request.url.path} — {response.status_code} ({process_time:.3f}s)")
    return response


# ─── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"


app.include_router(tenants.router,     prefix=f"{API_PREFIX}/tenants",     tags=["Tenants"])
app.include_router(predictions.router, prefix=f"{API_PREFIX}/predictions", tags=["Predictions"])
app.include_router(analytics.router,   prefix=f"{API_PREFIX}/analytics",   tags=["Analytics"])
app.include_router(chatbot.router,     prefix=f"{API_PREFIX}/chatbot",     tags=["Chatbot"])
app.include_router(retention.router,   prefix=f"{API_PREFIX}/retention",   tags=["Retention"])
app.include_router(upload.router,      prefix=f"{API_PREFIX}/upload",      tags=["Upload"])
app.include_router(payments.router,    prefix=f"{API_PREFIX}/payments",    tags=["Payments"])


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "TenantSense AI API",
        "version": "1.0.0",
        "timestamp": time.time(),
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to TenantSense AI API",
        "docs": "/docs",
        "health": "/health",
        "register_tenant_form": "/register-tenant",
    }


@app.get("/register-tenant", tags=["Form"])
async def get_registration_form():
    from fastapi.responses import HTMLResponse
    from fastapi import HTTPException
    import os
    # Try multiple paths to find tenantsense.html
    paths_to_try = [
        os.path.join(_PROJECT_ROOT, "tenantsense.html"),
        os.path.join(os.path.dirname(__file__), "../../tenantsense.html"),
        os.path.join(os.getcwd(), "tenantsense.html"),
    ]
    for p in paths_to_try:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read(), status_code=200)
    
    raise HTTPException(status_code=404, detail="tenantsense.html file not found in the backend workspace")


# ─── Simple user endpoint (no auth, no DB query) ─────────────────────────────
@app.get("/api/v1/auth/me", tags=["User"])
async def get_me():
    return {
        "id": "default-admin",
        "email": "admin@tenantsense.ai",
        "full_name": "Admin User",
        "role": "admin",
        "preferred_language": "en",
    }

