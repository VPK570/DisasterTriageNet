# DisasterTriageNet - Agent Instructions

## graphify Knowledge Graph

This project has a graphify knowledge graph at `graphify-out/`.

Rules:
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

---

## Project Overview

DisasterTriageNet is an AI-powered emergency management system for mass-casualty events. It combines:
- **ML Triage Prediction**: LightGBM model predicts severity (Low/Moderate/High/Critical)
- **Geospatial Clustering**: DBSCAN with severity/temporal weighting
- **Real-time Coordination**: WebSocket updates for dashboard
- **Ambulance Dispatch**: Severity-weighted allocation + re-optimization on deterioration

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Leaflet, Recharts, Socket.io-client |
| Backend | Python 3.13, Flask, Flask-SocketIO, SQLite |
| ML | LightGBM, SHAP |
| Auth | JWT, Bcrypt, RBAC |

---

## Project Structure

```
DisasterTriageNet/
├── backend/
│   ├── app.py              # Main Flask app
│   ├── config.py           # Environment configuration
│   ├── core/
│   │   ├── ml_model.py    # LightGBM inference
│   │   └── clustering.py # DBSCAN hotspots
│   ├── api/
│   │   └── schemas.py    # API request/response schemas
│   ├── auth/
│   │   ├── login.py      # Login endpoint
│   │   ├── register.py  # Registration endpoint
│   │   ├── profile.py   # User profile
│   │   └── jwt_handler.py # JWT token handling
│   ├── routes/
│   │   ├── core_routes.py    # Main API routes
│   │   ├── victim_routes.py # Victim CRUD
│   │   ├── admin_routes.py  # Admin endpoints
│   │   └── responder_routes.py # Responder endpoints
│   ├── middleware/
│   │   └── role_guard.py   # RBAC middleware
│   ├── models/
│   │   └── user_model.py   # User model
│   ├── services/
│   │   ├── dispatch_service.py   # Ambulance dispatch
│   │   ├── hospital_service.py # Hospital management
│   │   ├── db.py              # Database service
│   │   ├── task_queue.py      # Async task queue
│   │   └── rate_limiter.py   # Rate limiting
│   ├── utils/
│   │   ├── validators.py     # Input validation
│   │   ├── responses.py    # Response helpers
│   │   ├── logging_config.py # Logging config
│   │   └── extensions.py  # Flask extensions
│   ├── migrations/       # DB migrations (001-009)
│   ├── scripts/
│   │   ├── setup.py     # Database seeding
│   │   └── simulator.py # Load testing
│   ├── tests/           # Unit tests
│   ├── triage.db        # SQLite database
│   └── triage_model.txt # LightGBM model
├── rescue-dashboard/    # React 19 frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx        # Leaflet map
│   │   │   ├── AmbulancePanel.jsx # Fleet management
│   │   │   ├── IncidentTimeline.jsx # Status timeline
│   │   │   └── VictimCard.jsx    # Victim card
│   │   ├── config.js   # API configuration
│   │   └── socket.js # WebSocket client
├── docs/
│   ├── SETUP.md        # Dev setup guide
│   ├── AGENTS.md     # Agent instructions
│   └── litreview_patents.md # Patent survey
└── README.md         # Project overview
```

---

## Running the Application

```bash
# Backend (port 5001)
cd backend && python app.py

# Frontend (port 5173)
cd rescue-dashboard && npm run dev
```

---

## Key Database Tables

- `victims`: Injured persons with vitals, triage_level, lat/lng
- `clusters`: Geographic hotspots from DBSCAN
- `hospitals`: Medical facilities with bed capacity
- `ambulances`: Emergency vehicles with GPS tracking
- `incidents`: Disaster events
- `reopt_events`: Re-optimization triggers (deterioration)
- `cluster_allocation_log`: Ambulance allocation per cluster

---

## Benchmark Results (10 runs)

| Scenario | Metric | BASELINE_1 | BASELINE_2 | SYSTEM |
|----------|--------|------------|------------|--------|
| A | Critical Mean Wait | 101.5s | 88.6s | **88.6s** |
| A | Critical Response Rate | 100% | 100% | 100% |
| B | Reopt Events | 0 | 0 | **38.7** |
| B | Victims Worsened | 0 | 0 | 20.0 |
| C | Critical Response Rate | 33.3% | 33.3% | 33.3% |

Key improvement: **13% faster critical response** in Scenario A.

---

## Database Migrations

| # | Purpose |
|---|---------|
| 001 | Core tables (victims, hospitals, clusters, incidents) |
| 002 | Add incident_id foreign key |
| 003 | Add ambulances table |
| 004 | Add discharged_at timestamp |
| 005 | Add ML confidence score |
| 006 | Performance indexes |
| 007 | (not used) |
| 008 | Add cluster_label to victims |
| 009 | Create cluster_allocation_log |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ingest` | responder/admin | Ingest victim vitals, get ML triage |
| GET | `/api/victims` | Public | List victims with pagination |
| PATCH | `/api/victims/<id>/discharge` | responder/admin | Discharge victim |
| POST | `/api/assign` | responder/admin | Assign victim to ambulance |
| POST | `/api/assign/batch` | responder/admin | Batch assign multiple victims |
| GET | `/api/ambulances` | auth | List ambulances with status |
| PATCH | `/api/ambulances/<id>/status` | responder/admin | Update ambulance status |
| GET | `/api/hospitals` | auth | List hospitals with ETA |
| GET | `/api/clusters` | auth | Get hotspots |
| POST | `/api/incidents/<id>/allocate` | responder/admin | Cluster-proportional allocation |
| GET | `/api/incidents` | auth | List incidents |
| POST | `/api/incidents` | admin | Create new incident |
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login, get JWT |
| GET | `/api/incidents/<id>/timeline` | auth | Get incident timeline |

---

## Default Accounts (after `python setup.py --fresh`)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@disaster.net | admin123 |
| Responder | simulator@disaster.net | simulator123 |

---

## Notes

- Backend runs on port 5001 (avoid macOS AirPlay conflict on 5000)
- CORS restricted to `localhost:5173`
- JWT_SECRET: environment-based (warns in dev, crashes in prod if not set)
- Use `python setup.py --fresh` to reset database
- WebSocket events: `victim_update`, `ambulance_update`, `victim_assigned`, `incident_reset`