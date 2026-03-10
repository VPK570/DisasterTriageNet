import eventlet
eventlet.monkey_patch()
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import sqlite3
from datetime import datetime
from ml_model import predict_triage
from clustering import calculate_hotspots
from math import radians, cos, sin, asin, sqrt
import random
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
socketio = SocketIO(app, cors_allowed_origins="*")

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

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
    # Increased timeout to 30s to handle concurrent simulator waves
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
        print(f"🏥 Hospital Match Error: {e}")
        return None

# --- API ROUTES ---

@app.route('/api/ingest', methods=['POST'])
def ingest_data():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    victim_id = f"V-{random.randint(1000, 9999)}"
    
    # 1. ML Triage Prediction
    try:
        severity = predict_triage(
            data['age'], data['heart_rate'], data['spo2'], data['temperature']
        )
    except Exception as e:
        print(f"🧠 ML Prediction Error: {e}")
        severity = 1 # Fallback

    # 2. Match Nearest Hospital
    matched_hosp = match_hospital(data['lat'], data['lng'])
    hosp_name = matched_hosp['name'] if matched_hosp else "Waitlisted"

    # 3. Save to Database (With dedicated Try/Except)
    conn = None
    try:
        conn = get_db_connection()
        
        # INSERT Victim Data
        conn.execute('''
            INSERT INTO victims (id, age, heart_rate, spo2, temperature, triage_level, lat, lng, timestamp, status, hospital_assigned)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            victim_id, data['age'], data['heart_rate'], data['spo2'], data['temperature'],
            severity, data['lat'], data['lng'], datetime.now().isoformat(), 'unassigned', hosp_name
        ))
        
        # UPDATE Hospital Beds
        if matched_hosp:
            conn.execute('UPDATE hospitals SET available_beds = available_beds - 1 WHERE id = ?', (matched_hosp['id'],))
        
        conn.commit()
        print(f"💾 DB Update Success: {victim_id}")

    except sqlite3.Error as e:
        print(f"❌ Database Insertion Error: {e}")
        if conn: conn.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn: conn.close()

    # 4. Trigger Clustering (Separated to prevent Ingest Hangs)
    try:
        # If your simulator is very fast, you can comment this out 
        # and create a separate route for clustering.
        calculate_hotspots() 
    except Exception as e:
        print(f"📍 Clustering Warning: {e} (Continuing simulation regardless)")

    print(f"✅ Processed {victim_id} | Triage: {severity}")
    
    # Feature 2: Emit to all connected dashboard clients
    socketio.emit('victim_ingested', {
        'id': victim_id,
        'triage_level': severity,
        'lat': data['lat'],
        'lng': data['lng'],
        'hospital_assigned': hosp_name,
        'timestamp': datetime.now().isoformat()
    })

    return jsonify({
        "status": "success", 
        "predicted_severity": severity,
        "assigned_to": hosp_name
    }), 201

@app.route('/api/victims/<victim_id>/qr', methods=['GET'])
def get_victim_qr(victim_id):
    # URL that opens the victim's triage card on mobile
    card_url = f"http://localhost:5173/victim/{victim_id}"

    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(card_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#f1f5f9", back_color="#0f172a")  # matches dark theme
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode()

    return jsonify({'qr_base64': encoded, 'url': card_url, 'victim_id': victim_id})

# --- GETTERS ---

@app.route('/api/victims', methods=['GET'])
def get_victims():
    try:
        conn = get_db_connection()
        victims = conn.execute('SELECT * FROM victims ORDER BY triage_level DESC, timestamp DESC').fetchall()
        conn.close()
        return jsonify([dict(row) for row in victims])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clusters', methods=['GET'])
def get_clusters():
    try:
        conn = get_db_connection()
        clusters = conn.execute('SELECT * FROM clusters').fetchall()
        conn.close()
        return jsonify([dict(row) for row in clusters])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    try:
        conn = get_db_connection()
        hospitals = conn.execute('SELECT * FROM hospitals').fetchall()
        conn.close()
        return jsonify([dict(row) for row in hospitals])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("📡 Chennai AI Triage API live at http://127.0.0.1:5001")
    socketio.run(app, debug=True, port=5001)