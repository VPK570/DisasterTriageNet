# 🚑 DisasterTriageNet

DisasterTriageNet is an AI-powered emergency management system designed to optimize disaster response. It combines real-time victim health telemetry, machine learning-based triage scoring, and geospatial clustering to coordinate medical resources efficiently during mass-casualty events.

---

## 🚀 Getting Started

**We've recently overhauled the project documentation!** 
For complete instructions on setting up your development environment, initializing the database, and running the real-time simulation, please refer to our new guide:

👉 **[View the Professional Setup Guide](./docs/SETUP.md)**

---

## 🔥 Key Features

- **🧠 AI Triage Scoring**: Predicts medical severity (Low to Critical) using a LightGBM model.
- **📍 Geospatial Hotspots**: Dynamic DBSCAN clustering of victims to identify major incident zones.
- **⚡ Real-Time Coordination**: Instant dashboard updates via **Socket.io** for victim ingestion and hospital bed status.
- **📅 Incident Management**: Multi-incident support to manage separate disaster episodes.
- **🚗 ETA Estimator**: Real-time calculation of ambulance arrival times to hospitals.
- **📱 Field QR Access**: Generates unique QR codes for victims for scanning by field responders.
- **🏥 Ambulance Fleet Management**: Real-time ambulance tracking with live status updates (station, dispatched, returning).
- **🗺️ Interactive Map View**: Leaflet-based map displaying victim locations and cluster visualizations.
- **📊 Incident Timeline**: Chronological timeline of victim status changes during an incident.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Leaflet, Recharts, Tailwind CSS, Socket.io-client.
- **Backend**: Python 3.13, Flask, Flask-SocketIO, SQLite, Scikit-learn, LightGBM.
- **Communication**: WebSockets (Real-time), REST API (State management).
- **Security**: JWT Authentication, Bcrypt password hashing, Role-Based Access Control, Environment-based secrets.

---

## 🏗️ Project Structure

```
DisasterTriageNet/
├── backend/
│   ├── api/              # API route modules
│   ├── core/             # Core business logic
│   ├── routes/           # Route handlers (core_routes.py)
│   ├── scripts/         # Utility scripts
│   ├── tests/          # Backend tests
│   ├── migrations/     # Database migrations (001-009)
│   └── app.py          # Main Flask application
├── rescue-dashboard/   # React frontend
│   └── src/
│       ├── components/   # UI components (MapView, AmbulancePanel, etc.)
│       ├── config.js   # API configuration
│       └── socket.js  # WebSocket client
└── docs/              # Documentation
```

---

## 🗄️ Database Migrations

| Migration | Description |
|-----------|-------------|
| 001 | Initial schema |
| 002 | Add incidents table |
| 003 | Add JWT_SECRET |
| 004 | Add vitals table |
| 005 | Add incidents_logs table |
| 006 | Performance indexes |
| 007 | Add vitals history |
| 008 | Add cluster_id to incidents |
| 009 | Add cluster allocation logs |

---

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file for details.
