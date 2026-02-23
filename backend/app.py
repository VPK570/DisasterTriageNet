from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)  # This allows your React frontend (localhost:5173) to talk to this API

DB_PATH = 'triage.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This lets us access columns by name
    return conn

# 1. Endpoint to get all victims for the map and list
@app.route('/api/victims', methods=['GET'])
def get_victims():
    conn = get_db_connection()
    # We fetch all victims, usually sorting by triage level (highest first)
    victims = conn.execute('SELECT * FROM victims ORDER BY triage_level DESC, timestamp DESC').fetchall()
    conn.close()
    
    # Convert SQLite rows into a list of dictionaries for JSON
    return jsonify([dict(row) for row in victims])

# 2. Endpoint to get summary stats for the charts
@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    stats = {
        "total": conn.execute('SELECT COUNT(*) FROM victims').fetchone()[0],
        "critical": conn.execute('SELECT COUNT(*) FROM victims WHERE triage_level = 3').fetchone()[0],
        "assigned": conn.execute('SELECT COUNT(*) FROM victims WHERE status = "assigned"').fetchone()[0]
    }
    conn.close()
    return jsonify(stats)

# 3. Endpoint to "Assign" an ambulance (Updates the DB)
@app.route('/api/assign/<victim_id>', methods=['POST'])
def assign_victim(victim_id):
    conn = sqlite3.connect('triage.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE victims SET status = "assigned" WHERE id = ?', (victim_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"}), 200

@app.route('/api/clusters', methods=['GET'])
def get_clusters():
    conn = get_db_connection()
    clusters = conn.execute('SELECT * FROM clusters').fetchall()
    conn.close()
    return jsonify([dict(row) for row in clusters])


if __name__ == '__main__':
    # Running on port 5000 by default
    print("📡 Flask API is live at http://localhost:5000")
    app.run(debug=True, port=5000)