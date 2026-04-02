from flask import Blueprint, request, jsonify
from middleware.role_guard import require_role
import sqlite3
import math
import os

responder_bp = Blueprint('responder', __name__)

from config import DB_PATH

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn

def haversine(lat1, lng1, lat2, lng2):
    """Straight-line distance in km between two GPS points."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@responder_bp.route('/api/responder/dashboard', methods=['GET'])
@require_role('responder')
def dashboard():
    return jsonify({'message': 'Responder dashboard', 'user_id': request.user_id})


@responder_bp.route('/api/responder/route', methods=['POST'])
def optimize_route():
    """
    Greedy nearest-neighbour route from an ambulance's current position
    through all unassigned victims within radius_km (default 2 km).

    Request body (JSON):
    {
      "lat": 13.082,
      "lng": 80.270,
      "radius_km": 2.0  # optional
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

    # Greedy nearest-neighbour with severity tiebreak
    unvisited = list(nearby)
    route = []
    current_lat, current_lng = amb_lat, amb_lng
    total_dist = 0.0

    while unvisited:
        # Snapshot current position so the lambda captures fixed values
        _clat, _clng = current_lat, current_lng
        next_victim = min(
            unvisited,
            key=lambda v: haversine(_clat, _clng, v['lat'], v['lng']) - v['triage_level'] * 0.1
        )

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
        # Use identity comparison (is) to avoid false matches on equal dicts
        unvisited = [v for v in unvisited if v is not next_victim]

    return jsonify({
        'route': route,
        'total_distance_km': round(total_dist, 2),
        'victim_count': len(route)
    })
