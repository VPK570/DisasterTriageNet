# 🚑 DisasterTriageNet

DisasterTriageNet is an AI-powered emergency management system designed to optimize disaster response. It combines real-time victim health telemetry, machine learning-based triage scoring, and geospatial clustering to coordinate medical resources efficiently during mass-casualty events.

## 🔥 Key Features

- **🧠 AI Triage Scoring**: Predicts medical severity (Low to Critical) based on age, heart rate, $SpO_2$, and temperature using a LightGBM model.
- **📍 Geospatial Hotspots**: Dynamic DBSCAN clustering of victims to identify major incident zones and optimize hospital routing.
- **⚡ Real-Time Coordination**: Instant dashboard updates via **Socket.io** for victim ingestion, hospital bed status, and emergency alerts.
- **📅 Incident Management**: Multi-incident support allows commanders to manage separate disaster episodes (e.g., floods, fires) from a single interface.
- **🚗 ETA Estimator**: Real-time calculation of ambulance arrival times to hospitals based on geospatial data and traffic models.
- **📈 Incident Timeline**: Visual arrival tracker to monitor the flow of victims and severity trends.
- **📱 Field QR Access**: Generates unique QR codes for victims that field responders can scan to access patient details on mobile.

---

## 🏗️ Project Structure

```bash
DisasterTriageNet/
├── backend/            # Flask API, ML Models, and Database
│   ├── auth/           # JWT & Role-Based Access Control
│   ├── routes/         # Feature-specific API endpoints
│   ├── ml_model.py     # Triage prediction logic
│   └── simulator.py    # Emergency load testing tool
└── rescue-dashboard/   # React/Vite Frontend
    └── src/
        ├── components/ # Reusable UI components
        └── App.jsx     # Main Command Dashboard
```

---

## 🚀 Getting Started

### 1. Backend Setup (Flask)
```bash
cd backend
# Create environment
python -m venv venv
source venv/bin/activate  # Mac/Linux
# Install dependencies
pip install -r requirements.txt
# Initialize Database
python setup.py
# Start Server
python app.py
```

### 2. Frontend Setup (React)
```bash
cd rescue-dashboard
npm install
npm run dev
```

### 3. Run Simulation
To populate the dashboard with live data, run the simulator in a separate terminal:
```bash
cd backend
python simulator.py
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Leaflet (Map), Recharts (Analytics), Tailwind CSS, Socket.io-client.
- **Backend**: Python 3.13, Flask, Flask-SocketIO, SQLite, Scikit-learn, LightGBM.
- **Communication**: WebSockets (Real-time), REST API (State management).
- **Security**: JWT Authentication, Bcrypt password hashing, Role-Based Access (Admin/Responder).

---

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file for details.
