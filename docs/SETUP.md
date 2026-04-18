# 🚑 DisasterTriageNet Setup Guide

Welcome to the **DisasterTriageNet** setup guide. This document provides a step-by-step walkthrough to get the AI-powered emergency management system running on your local machine.

---

## 📋 Prerequisites

Ensure you have the following installed:

- **Python 3.13+**
- **Node.js 20+** & **npm 10+**
- **Git**

---

## 🛠️ 1. Backend Setup (Flask)

The backend handles ML-based triage scoring, real-time coordination via WebSockets, and data management.

### Step 1.1: Environment Preparation

Navigate to the `backend` directory and set up a virtual environment.

```bash
cd backend
python -m venv venv
```

### Step 1.2: Activate Virtual Environment

- **Mac/Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows:**
  ```bash
  .\venv\Scripts\activate
  ```

### Step 1.3: Install Dependencies

Install the required Python packages.

```bash
pip install -r requirements.txt
```

### Step 1.4: Configuration (Environment Variables)

Create a `.env` file from the example template.

```bash
cp .env.example .env
```

Generate a secure secret key for JWT authentication and add it to your `.env` file:

```bash
python -c "import secrets; print(f'JWT_SECRET={secrets.token_hex(32)}')"
```

### Step 1.5: Database Initialization

Initialize the SQLite database and seed it with default data (hospitals, admin accounts, and an initial incident).

```bash
# Run a fresh installation (WARNING: This ignores/deletes existing data)
python setup.py --fresh
```

### Step 1.6: Start the Backend Server

Run the Flask server with `eventlet` support.

```bash
python app.py
```

The backend will be available at `http://localhost:5000`.

---

## 🏗️ 2. Frontend Setup (React + Vite)

The frontend is a high-end "Command Center" dashboard for real-time monitoring and management.

### Step 2.1: Install Dependencies

Navigate to the `rescue-dashboard` directory and install npm packages.

```bash
cd ../rescue-dashboard
npm install
```

### Step 2.2: Start Development Server

Launch the Vite development server.

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

---

## 🚀 3. Running the Simulation

To see the system in action with live data, you can run the emergency simulator. This will generate waves of dummy victims and feed them into the system.

1.  Open a new terminal.
2.  Navigate to the `backend` folder.
3.  Activate the virtual environment.
4.  Run the simulator:
    ```bash
    python simulator.py
    ```

---

## 🔑 Default Credentials

After seeding the database, you can log in with these default accounts:

| Role             | Email                    | Password       |
| :--------------- | :----------------------- | :------------- |
| **System Admin** | `admin@disaster.net`     | `admin123`     |
| **Responder**    | `simulator@disaster.net` | `simulator123` |

---

## 📂 Project Structure

```text
DisasterTriageNet/
├── backend/            # Flask API, ML Models, and Database
│   ├── core/          # ML model & clustering logic
│   ├── api/           # API request/response schemas
│   ├── auth/          # JWT & Role-Based Access Control
│   ├── routes/        # Feature-specific API endpoints
│   ├── middleware/    # RBAC middleware
│   ├── models/        # Data models
│   ├── services/      # Business logic services
│   ├── utils/        # Utility functions
│   ├── migrations/    # Database migrations
│   ├── scripts/      # Setup & simulator scripts
│   ├── tests/        # Unit tests
│   └── app.py        # Main Flask application
└── rescue-dashboard/   # React 19 Frontend
    ├── src/
    │   ├── components/ # UI components (MapView, AmbulancePanel, etc.)
    │   ├── config.js  # API configuration
    │   └── socket.js # WebSocket client
```

---

## 🛠️ Troubleshooting

- **Port Conflicts**: Ensure ports `5001` (Backend) and `5173` (Frontend) are available.
- **Database Errors**: If you encounter schema issues, run `python setup.py --fresh` to reset the database.
- **Socket connection failed**: If the dashboard doesn't update, verify that the backend is running and your browser allows connections to `localhost`.
- **JWT_SECRET missing**: Create a `.env` file and generate a secure key with `python -c "import secrets; print(f'JWT_SECRET={secrets.token_hex(32)}')"`
