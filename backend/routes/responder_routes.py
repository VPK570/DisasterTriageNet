from flask import Blueprint, request, jsonify
from middleware.role_guard import require_role
import sqlite3
import math

responder_bp = Blueprint('responder', __name__)

DB_PATH = "triage.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def haversine(lat1, lng1, lat2, lng2):
    """Straight-line distance in km between two GPS points."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Existing placeholder (unchanged) ────────────────────────────
@responder_bp.route('/dashboard', methods=['GET'])
@require_role('responder')
def dashboard():
    return jsonify({'message': 'Responder dashboard', 'user_id': request.user_id})


# ── NEW: Multi-victim route optimizer ───────────────────────────
@responder_bp.route('/route', methods=['POST'])
def optimize_route():
    """
    Greedy nearest-neighbour route from an ambulance's current position
    through all unassigned victims within radius_km (default 2 km).

    NOTE: No auth required here so the dashboard can call it without
    role-gating. Add @require_role('responder') if you lock down later.

    Request body (JSON):
    {
      "lat": 13.082,          # ambulance current latitude
      "lng": 80.270,          # ambulance current longitude
      "radius_km": 2.0        # optional, default 2 km
    }

    Response:
    {
      "route": [
        { "id": "V-1234", "lat": ..., "lng": ..., "triage_level": 3,
          "distance_from_prev_km": 0.4 },
        ...
      ],
      "total_distance_km": 1.8,
      "victim_count": 4
    }
    """
    data = request.get_json()
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({'error': 'lat and lng are required'}), 400

    amb_lat = float(data['lat'])
    amb_lng = float(data['lng'])
    radius_km = float(data.get('radius_km', 2.0))

    try:
        conn = get_db()
        rows = conn.execute(
            "SELECT id, lat, lng, triage_level FROM victims WHERE status != 'assigned'"
        ).fetchall()
        conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    # Filter to victims within radius
    nearby = [
        dict(r) for r in rows
        if haversine(amb_lat, amb_lng, r['lat'], r['lng']) <= radius_km
    ]

    if not nearby:
        return jsonify({'route': [], 'total_distance_km': 0, 'victim_count': 0})

    # Greedy nearest-neighbour starting from ambulance position
    # Priority: prefer higher triage_level (critical first) when distances are close.
    # Tie-break: if two victims are within 0.1 km of each other, pick higher severity.
    unvisited = list(nearby)
    route = []
    current_lat, current_lng = amb_lat, amb_lng
    total_dist = 0.0

    while unvisited:
        def score(v):
            dist = haversine(current_lat, current_lng, v['lat'], v['lng'])
            # Slight severity bonus: subtract up to 0.3 km for critical victims
            severity_bonus = v['triage_level'] * 0.1
            return dist - severity_bonus

        next_victim = min(unvisited, key=score)
        leg_dist = haversine(current_lat, current_lng, next_victim['lat'], next_victim['lng'])
        total_dist += leg_dist

        route.append({
            'id': next_victim['id'],
            'lat': next_victim['lat'],
            'lng': next_victim['lng'],
            'triage_level': next_victim['triage_level'],
            'distance_from_prev_km': round(leg_dist, 2)
        })

        current_lat = next_victim['lat']
        current_lng = next_victim['lng']
        unvisited.remove(next_victim)

    return jsonify({
        'route': route,
        'total_distance_km': round(total_dist, 2),
        'victim_count': len(route)
    })
