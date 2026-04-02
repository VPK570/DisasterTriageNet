# 🚑 DisasterTriageNet

DisasterTriageNet is an AI-powered emergency management system designed to optimize disaster response. It combines real-time victim health telemetry, machine learning-based triage scoring, and geospatial clustering to coordinate medical resources efficiently during mass-casualty events.

---

## 🚀 Getting Started

**We've recently overhauled the project documentation!** 
For complete instructions on setting up your development environment, initializing the database, and running the real-time simulation, please refer to our new guide:

👉 **[View the Professional Setup Guide](./SETUP.md)**

---

## 🔥 Key Features

- **🧠 AI Triage Scoring**: Predicts medical severity (Low to Critical) using a LightGBM model.
- **📍 Geospatial Hotspots**: Dynamic DBSCAN clustering of victims to identify major incident zones.
- **⚡ Real-Time Coordination**: Instant dashboard updates via **Socket.io** for victim ingestion and hospital bed status.
- **📅 Incident Management**: Multi-incident support to manage separate disaster episodes.
- **🚗 ETA Estimator**: Real-time calculation of ambulance arrival times to hospitals.
- **📱 Field QR Access**: Generates unique QR codes for victims for scanning by field responders.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Leaflet, Recharts, Tailwind CSS, Socket.io-client.
- **Backend**: Python 3.13, Flask, Flask-SocketIO, SQLite, Scikit-learn, LightGBM.
- **Communication**: WebSockets (Real-time), REST API (State management).
- **Security**: JWT Authentication, Bcrypt password hashing, Role-Based Access Control.

---

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file for details.
