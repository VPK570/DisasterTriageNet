from flask import Blueprint, request, jsonify
from lib.role_guard import require_role

from lib.hospital_service import haversine
from lib.db import get_db_connection

responder_bp = Blueprint('responder', __name__)

SEVERITY_PRIZE = {0: 1, 1: 2, 2: 5, 3: 10}


@responder_bp.route('/api/responder/dashboard', methods=['GET'])
@require_role('responder', 'admin')
def dashboard():
    return jsonify({'message': 'Responder dashboard', 'user_id': request.user_id})


@responder_bp.route('/api/responder/route', methods=['POST'])
@require_role('responder', 'admin')
def optimize_route():
    """
    Greedy prize-collecting nearest-neighbour route from an ambulance's current
    position through all unassigned victims within radius_km (default 2 km).
    """
    data = request.get_json()
    if not data or 'lat' not in data or 'lng' not in data:
        return jsonify({'error': 'lat and lng are required'}), 400

    amb_lat = float(data['lat'])
    amb_lng = float(data['lng'])
    radius_km = float(data.get('radius_km', 2.0))
    incident_id = data.get('incident_id', '00000000-0000-0000-0000-000000000001')

    try:
        conn = get_db_connection()
        rows = conn.execute(
            "SELECT id, lat, lng, triage_level FROM victims WHERE status != 'assigned' AND incident_id = ?",
            (incident_id,)
        ).fetchall()
        conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    nearby = [
        dict(r) for r in rows
        if haversine(amb_lat, amb_lng, r['lat'], r['lng']) <= radius_km
    ]

    if not nearby:
        return jsonify({'route': [], 'total_distance_km': 0, 'victim_count': 0})

    unvisited = list(nearby)
    route = []
    current_lat, current_lng = amb_lat, amb_lng
    total_dist = 0.0

    while unvisited:
        _clat, _clng = current_lat, current_lng
        next_victim = max(
            unvisited,
            key=lambda v: SEVERITY_PRIZE.get(v['triage_level'], 1) / max(
                haversine(_clat, _clng, v['lat'], v['lng']), 0.001
            )
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
        unvisited = [v for v in unvisited if v is not next_victim]

    return jsonify({
        'route': route,
        'total_distance_km': round(total_dist, 2),
        'victim_count': len(route)
    })