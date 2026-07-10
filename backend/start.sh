#!/usr/bin/env bash
##############################################################################
# backend/start.sh — Render startup script for TenantSense AI
#
# Render runs this from the repo ROOT directory (because rootDir: . in
# render.yaml), which means machine_learning/, chatbot/, etc. are all
# accessible on sys.path via main.py's _PROJECT_ROOT logic.
##############################################################################

set -euo pipefail

echo "🚀 Starting TenantSense AI Backend..."
echo "   Working directory: $(pwd)"
echo "   Python: $(python --version)"

# Run database migrations if alembic.ini exists
if [ -f "backend/alembic.ini" ]; then
  echo "📦 Running Alembic migrations..."
  cd backend && alembic upgrade head && cd ..
fi

# Launch uvicorn — app is at backend/app/main.py (module path: app.main)
# Workers: 1 on free/starter, increase on higher Render plans
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers 1 \
  --app-dir backend \
  --log-level info \
  --no-access-log
