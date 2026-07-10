# TenantSense AI 🏢🤖

> **AI-powered lease renewal prediction platform** — predicts tenant non-renewal 3–6 months in advance using XGBoost + SHAP, with personalized retention strategies, multilingual support (English, Tamil, Hindi), and a real-time dashboard.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔮 **AI Prediction** | XGBoost model predicts non-renewal with ≥90% AUC-ROC |
| 🧠 **Explainable AI** | SHAP waterfall charts explain every prediction |
| 🌍 **Multilingual** | Full support for English, Tamil (தமிழ்), Hindi (हिन्दी) |
| 🤖 **AI Chatbot** | Gemini-powered assistant with tenant context awareness |
| 📊 **Analytics** | Vacancy forecasting, revenue loss projections, KPI dashboard |
| 🛡️ **Retention** | Rule-based + LLM-generated personalized retention strategies |
| ⚡ **Real-time** | WebSocket prediction push + APScheduler nightly batch jobs |
| 🔐 **Secure** | JWT auth, role-based access (admin / property_manager / landlord) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TenantSense AI                        │
├──────────────────┬──────────────────┬───────────────────┤
│  Next.js 14      │  FastAPI Backend  │  ML Pipeline      │
│  Frontend        │  (Python 3.11)   │  (XGBoost+SHAP)   │
├──────────────────┴──────────────────┴───────────────────┤
│  PostgreSQL (structured) │ MongoDB (logs) │ Redis (cache)│
├──────────────────────────┴───────────────┴──────────────┤
│  Gemini API (chatbot)  │  Docker Compose (deployment)   │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose

### 1. Clone & Configure

```bash
git clone <repo-url>
cd TenantSenseAI
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY
```

### 2. Start All Services (Docker)

```bash
docker-compose up -d
```

Services: `http://localhost:3000` (Frontend) | `http://localhost:8000/docs` (API)

### 3. Manual Setup (Development)

**Backend:**
```bash
pip install -r requirements.txt
cd backend
uvicorn app.main:app --reload --port 8000
```

**Generate Dataset & Train ML Model:**
```bash
python datasets/generate_synthetic_data.py
python machine_learning/training/train_xgboost.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 📁 Project Structure

```
TenantSenseAI/
├── backend/app/
│   ├── api/routes/          # FastAPI routers (auth, tenants, predictions, analytics, chatbot, retention)
│   ├── models/              # SQLAlchemy ORM models
│   ├── authentication/      # JWT auth
│   ├── database/            # PostgreSQL + MongoDB clients
│   └── main.py              # App entry point
├── machine_learning/
│   ├── training/            # XGBoost training pipeline
│   ├── explainability/      # SHAP explainer
│   ├── prediction/          # Inference predictor
│   └── models/              # Saved model artifacts
├── frontend/src/
│   ├── app/(dashboard)/     # Dashboard, Tenants, Analytics, Chatbot pages
│   ├── components/          # RiskGauge, SHAPWaterfallChart, StatCard, Sidebar
│   ├── contexts/            # AuthContext
│   └── lib/api.ts           # Axios API client
├── chatbot/                 # Gemini chatbot engine + translation
├── realtime_engine/         # WebSocket manager + APScheduler
├── analytics/               # KPI, vacancy & revenue forecasting
├── datasets/                # Synthetic data generator
├── tests/                   # pytest suites
└── docker-compose.yml       # Full stack orchestration
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | JWT login |
| POST | `/api/v1/auth/register` | Register user |
| GET  | `/api/v1/tenants/` | List tenants |
| POST | `/api/v1/predictions/` | Run ML prediction |
| GET  | `/api/v1/analytics/dashboard` | KPI metrics |
| GET  | `/api/v1/analytics/vacancy-forecast` | Vacancy projection |
| GET  | `/api/v1/analytics/revenue-forecast` | Revenue loss projection |
| POST | `/api/v1/chatbot/` | Multilingual AI chat |
| GET  | `/api/v1/retention/{tenant_id}` | Retention strategies |
| POST | `/api/v1/upload/tenants/csv` | Bulk CSV import |

Full docs: `http://localhost:8000/docs`

---

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v --cov=backend

# ML model accuracy check
pytest tests/test_ml_model.py -v

# API integration tests
pytest tests/test_prediction_api.py -v
```

---

## 🌐 Multilingual Support

| Language | Code | UI | Chatbot | Retention |
|---|---|---|---|---|
| English | `en` | ✅ | ✅ | ✅ |
| Tamil   | `ta` | ✅ | ✅ | ✅ |
| Hindi   | `hi` | ✅ | ✅ | ✅ |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 🗺️ Roadmap (Future Scope)

- [ ] Mobile application (React Native)
- [ ] IoT smart building integration
- [ ] Blockchain-based lease contracts
- [ ] Digital Twin property simulation
- [ ] WhatsApp / SMS alert integration
