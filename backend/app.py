import eventlet
eventlet.monkey_patch()
from flask import Flask, jsonify, request
from flask_socketio import SocketIO
from flask_cors import CORS
import sqlite3
from datetime import datetime
from ml_model import predict_triage
from clustering import calculate_hotspots
from math import radians, cos, sin, asin, sqrt
import uuid
import os
import qrcode
import io
import base64

from auth.register import register_bp
from auth.login import login_bp
from auth.profile import profile_bp
from routes.victim_routes import victim_bp
from routes.responder_routes import responder_bp
from routes.admin_routes import admin_bp

app = Flask(__name__)

# Match SocketIO CORS with REST CORS — only accept from known dashboard origin
ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
socketio = SocketIO(app, cors_allowed_origins=ALLOWED_ORIGINS)
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

# Register Auth Blueprints
app.register_blueprint(register_bp, url_prefix='/api/auth')
app.register_blueprint(login_bp, url_prefix='/api/auth')
app.register_blueprint(profile_bp, url_prefix='/api/auth')

# Register Feature Blueprints
app.register_blueprint(victim_bp)
app.register_blueprint(responder_bp)
app.register_blueprint(admin_bp)

DB_PATH = os.path.join(os.path.dirname(__file__), 'triage.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn

def get_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    return R * (2 * asin(sqrt(a)))

def match_hospital(victim_lat, victim_lng):
    try:
        conn = get_db_connection()
        hospitals = conn.execute('SELECT * FROM hospitals WHERE available_beds > 0').fetchall()
        conn.close()
        best_hospital = None
        min_distance = float('inf')
        for h in hospitals:
            dist = get_distance(victim_lat, victim_lng, h['lat'], h['lng'])
            if dist < min_distance:
                min_distance = dist
                best_hospital = h
        return best_hospital
    except Exception as e:
        print(f"Hospital Match Error: {e}")
        return None

def run_clustering(incident_id='INC-001'):
    try:
        calculate_hotspots(incident_id)
        socketio.emit('clusters_updated', {'incident_id': incident_id})
    except Exception as e:
        print(f"Background Clustering Error: {e}")

# --- API ROUTES ---

@app.route('/api/ingest', methods=['POST'])
def ingest_data():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    # Validate required fields
    required = ['age', 'heart_rate', 'spo2', 'temperature', 'lat', 'lng']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    # Use UUID to avoid ID collisions
    victim_id = f"V-{uuid.uuid4().hex[:8].upper()}"

    try:
        severity = predict_triage(
            data['age'], data['heart_rate'], data['spo2'], data['temperature']
        )
    except Exception as e:
        print(f"ML Prediction Error: {e}")
        severity = 1  # Fallback to moderate

    matched_hosp = match_hospital(data['lat'], data['lng'])
    hosp_name = matched_hosp['name'] if matched_hosp else "Waitlisted"

    conn = None
    try:
        conn = get_db_connection()
        incident_id = data.get('incident_id', 'INC-001')
        conn.execute('''
            INSERT INTO victims (id, age, heart_rate, spo2, temperature, triage_level, lat, lng, timestamp, status, hospital_assigned, incident_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            victim_id, data['age'], data['heart_rate'], data['spo2'], data['temperature'],
            severity, data['lat'], data['lng'], datetime.now().isoformat(), 'unassigned', hosp_name, incident_id
        ))
        if matched_hosp:
            conn.execute('UPDATE hospitals SET available_beds = available_beds - 1 WHERE id = ?', (matched_hosp['id'],))
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database Insertion Error: {e}")
        if conn: conn.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn: conn.close()

    socketio.start_background_task(run_clustering, incident_id)

    socketio.emit('victim_ingested', {
        'id': victim_id,
        'triage_level': severity,
        'lat': data['lat'],
        'lng': data['lng'],
        'hospital_assigned': hosp_name,
        'timestamp': datetime.now().isoformat(),
        'incident_id': incident_id
    })

    return jsonify({
        "status": "success",
        "victim_id": victim_id,
        "predicted_severity": severity,
        "assigned_to": hosp_name
    }), 201

@app.route('/api/ambulances', methods=['GET'])
def get_ambulances():
    """Return all ambulances from the database."""
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM ambulances ORDER BY id').fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ambulances/<amb_id>/status', methods=['PATCH'])
def update_ambulance_status(amb_id):
    """Update an ambulance's status and optionally its assigned victim."""
    data = request.json
    if not data or 'status' not in data:
        return jsonify({"error": "'status' field is required"}), 400
    new_status = data['status'].lower()
    if new_status not in ('available', 'busy', 'offline'):
        return jsonify({"error": "status must be available, busy, or offline"}), 400
    assigned_victim = data.get('assigned_victim', None)
    conn = None
    try:
        conn = get_db_connection()
        row = conn.execute("SELECT id FROM ambulances WHERE id = ?", (amb_id,)).fetchone()
        if not row:
            return jsonify({"error": "Ambulance not found"}), 404
        conn.execute(
            "UPDATE ambulances SET status = ?, assigned_victim = ? WHERE id = ?",
            (new_status, assigned_victim, amb_id)
        )
        conn.commit()
        socketio.emit('ambulance_updated', {'amb_id': amb_id, 'status': new_status, 'assigned_victim': assigned_victim})
        return jsonify({"status": new_status, "amb_id": amb_id}), 200
    except sqlite3.Error as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route('/api/assign/<victim_id>', methods=['POST'])
def assign_victim(victim_id):
    """Mark a victim as dispatched and auto-assign the nearest available ambulance."""
    conn = None
    try:
        conn = get_db_connection()
        victim = conn.execute("SELECT * FROM victims WHERE id = ?", (victim_id,)).fetchone()
        if not victim:
            return jsonify({"error": "Victim not found"}), 404
        if victim['status'] == 'assigned':
            return jsonify({"message": "Already assigned", "victim_id": victim_id}), 200

        conn.execute("UPDATE victims SET status = 'assigned' WHERE id = ?", (victim_id,))

        # Auto-assign the nearest available ambulance
        ambulances = conn.execute(
            "SELECT * FROM ambulances WHERE status = 'available'"
        ).fetchall()
        assigned_amb = None
        if ambulances and victim['lat'] and victim['lng']:
            nearest = min(
                ambulances,
                key=lambda a: get_distance(victim['lat'], victim['lng'], a['lat'], a['lng'])
            )
            conn.execute(
                "UPDATE ambulances SET status = 'busy', assigned_victim = ? WHERE id = ?",
                (victim_id, nearest['id'])
            )
            assigned_amb = nearest['id']

        conn.commit()
        socketio.emit('victim_assigned', {'victim_id': victim_id, 'ambulance_id': assigned_amb})
        if assigned_amb:
            socketio.emit('ambulance_updated', {'amb_id': assigned_amb, 'status': 'busy', 'assigned_victim': victim_id})
        return jsonify({"status": "assigned", "victim_id": victim_id, "ambulance_assigned": assigned_amb}), 200
    except sqlite3.Error as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM incidents ORDER BY created_at DESC').fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/incidents', methods=['POST'])
def create_incident():
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({"error": "'name' field is required"}), 400
        inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO incidents (id, name, type, lat, lng) VALUES (?, ?, ?, ?, ?)',
            (inc_id, data['name'], data.get('type', 'general'), data.get('lat', 13.0827), data.get('lng', 80.2707))
        )
        conn.commit()
        conn.close()
        return jsonify({'incident_id': inc_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/victims/<victim_id>/qr', methods=['GET'])
def get_victim_qr(victim_id):
    try:
        card_url = f"http://localhost:5173/victim/{victim_id}"
        qr = qrcode.QRCode(box_size=8, border=2)
        qr.add_data(card_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#f1f5f9", back_color="#0f172a")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode()
        return jsonify({'qr_base64': encoded, 'url': card_url, 'victim_id': victim_id})
    except Exception as e:
        return jsonify({"error": f"QR generation failed: {str(e)}"}), 500

@app.route('/api/victims', methods=['GET'])
def get_victims():
    try:
        incident_id = request.args.get('incident_id')
        conn = get_db_connection()
        if incident_id:
            victims = conn.execute(
                'SELECT * FROM victims WHERE incident_id=? ORDER BY triage_level DESC, timestamp DESC',
                (incident_id,)
            ).fetchall()
        else:
            victims = conn.execute(
                'SELECT * FROM victims ORDER BY triage_level DESC, timestamp DESC'
            ).fetchall()
        conn.close()
        return jsonify([dict(row) for row in victims])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clusters', methods=['GET'])
def get_clusters():
    try:
        incident_id = request.args.get('incident_id')
        conn = get_db_connection()
        if incident_id:
            clusters = conn.execute('SELECT * FROM clusters WHERE incident_id=?', (incident_id,)).fetchall()
        else:
            clusters = conn.execute('SELECT * FROM clusters').fetchall()
        conn.close()
        return jsonify([dict(row) for row in clusters])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    try:
        conn = get_db_connection()
        hospitals = [dict(row) for row in conn.execute('SELECT * FROM hospitals').fetchall()]
        clusters = [dict(row) for row in conn.execute('SELECT lat, lng FROM clusters').fetchall()]
        conn.close()
        result = []
        for h in hospitals:
            if clusters:
                min_dist = min(get_distance(h['lat'], h['lng'], c['lat'], c['lng']) for c in clusters)
                h['eta_minutes'] = round((min_dist / 40) * 60, 1)
                h['distance_km'] = round(min_dist, 2)
            else:
                h['eta_minutes'] = None
                h['distance_km'] = None
            result.append(h)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("API starting on http://0.0.0.0:5001")
    socketio.run(app, debug=False, port=5001, host='0.0.0.0')