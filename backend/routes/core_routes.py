from flask import Blueprint, request, jsonify
from flask_smorest import Blueprint as SmorestBlueprint
import sqlite3
from datetime import datetime
import uuid
from core.ml_model import predict_triage, get_explanation
from core.clustering import calculate_hotspots
from lib.db import get_db_connection
from lib.hospital_service import match_hospital
from lib.dispatch_service import assign_nearest_ambulance
from lib.extensions import socketio, task_queue
from lib.responses import error_response, success_response
from lib.role_guard import require_auth, require_role
from lib.rate_limiter import rate_limit
from config import DEFAULT_INCIDENT_ID
from lib.logging_config import get_logger
from lib.task_queue import TaskQueue
from api.schemas import (
    VictimIngestSchema, VictimIngestResponseSchema, ErrorResponseSchema,
    PaginatedVictimsSchema, HospitalSchema, AmbulanceSchema, ClusterSchema,
    IncidentSchema, RouteRequestSchema, RouteResponseSchema,
    VitalsUpdateSchema, VitalsHistoryResponseSchema
)

logger = get_logger('triage.core_routes')
# task_queue is now imported from extensions

core_api = SmorestBlueprint(
    'core',
    __name__,
    url_prefix='/api',
    description='Core DisasterTriageNet operations: victim ingestion, resource management, and dispatch.'
)


@core_api.route('/ingest', methods=['POST'])
@core_api.arguments(VictimIngestSchema, location='json')
@core_api.doc(security=['BearerAuth'], tags=['Victims'], description='Ingest victim vitals and get ML triage prediction')
@require_role('responder', 'admin')
@rate_limit(max_requests=30, window_seconds=60)
def ingest_data(*args, **kwargs):
    # Support both positional dict and keyword args from decorators
    if args and isinstance(args[0], dict):
        data = args[0]
    else:
        data = kwargs
    victim_id = f"V-{uuid.uuid4().hex[:8].upper()}"

    try:
        severity, confidence, probabilities = predict_triage(
            int(data['age']), float(data['heart_rate']), float(data['spo2']), float(data['temperature'])
        )
        explanation = get_explanation(
            int(data['age']), float(data['heart_rate']), float(data['spo2']), float(data['temperature'])
        )
    except Exception as e:
        logger.error("ML Prediction Error: %s", str(e), exc_info=True)
        severity = 1
        confidence = 0.0
        probabilities = [0.0, 0.0, 0.0, 0.0]
        explanation = []

    matched_hosp = match_hospital(data['lat'], data['lng'])
    hosp_name = matched_hosp['name'] if matched_hosp else "Waitlisted"

    conn = None
    try:
        conn = get_db_connection()
        incident_id = data.get('incident_id', DEFAULT_INCIDENT_ID)
        conn.execute('''
            INSERT INTO victims (id, age, heart_rate, spo2, temperature, triage_level, lat, lng, timestamp, status, hospital_assigned, incident_id, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            victim_id, int(data['age']), float(data['heart_rate']), float(data['spo2']), float(data['temperature']),
            severity, float(data['lat']), float(data['lng']), datetime.now().isoformat(), 'unassigned', hosp_name, incident_id, confidence
        ))
        if matched_hosp:
            conn.execute('UPDATE hospitals SET available_beds = available_beds - 1 WHERE id = ?', (matched_hosp['id'],))
        conn.commit()
    except sqlite3.Error as e:
        logger.error("Database Insertion Error: %s", str(e), exc_info=True)
        if conn: conn.rollback()
        return error_response("Database error", str(e), 500)
    finally:
        if conn: conn.close()

    def _run_clustering_and_notify(inc_id):
        try:
            calculate_hotspots(inc_id)
            socketio.emit('clusters_updated', {'incident_id': inc_id})
        except Exception as e:
            logger.error("Background Clustering Error: %s", str(e), exc_info=True)

    task_queue.submit(
        _run_clustering_and_notify,
        args=(incident_id,),
        name='clustering',
        debounce_key=f'cluster:{incident_id}',
        debounce_seconds=5,
        max_retries=2,
    )

    socketio.emit('victim_ingested', {
        'id': victim_id,
        'triage_level': severity,
        'confidence': confidence,
        'lat': data['lat'],
        'lng': data['lng'],
        'hospital_assigned': hosp_name,
        'timestamp': datetime.now().isoformat(),
        'incident_id': incident_id
    })

    return success_response({
        "status": "success",
        "victim_id": victim_id,
        "predicted_severity": severity,
        "confidence": confidence,
        "assigned_to": hosp_name
    }, 201)


@core_api.route('/ambulances', methods=['GET'])
@core_api.doc(security=['BearerAuth'], tags=['Resources'])
@require_auth
def get_ambulances():
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM ambulances ORDER BY id').fetchall()
        conn.close()
        return success_response([dict(r) for r in rows])
    except Exception as e:
        return error_response(str(e))


@core_api.route('/ambulances/<amb_id>/status', methods=['PATCH'])
@core_api.doc(security=['BearerAuth'], tags=['Resources'])
@require_role('responder', 'admin')
def update_ambulance_status(amb_id):
    data = request.json
    if not data or 'status' not in data:
        return error_response("'status' field is required", status=400)
    new_status = data['status'].lower()
    if new_status not in ('available', 'busy', 'offline'):
        return error_response("status must be available, busy, or offline", status=400)
    assigned_victim = data.get('assigned_victim', None)
    conn = None
    try:
        conn = get_db_connection()
        row = conn.execute("SELECT id FROM ambulances WHERE id = ?", (amb_id,)).fetchone()
        if not row:
            return error_response("Ambulance not found", status=404)
        conn.execute(
            "UPDATE ambulances SET status = ?, assigned_victim = ? WHERE id = ?",
            (new_status, assigned_victim, amb_id)
        )
        conn.commit()
        socketio.emit('ambulance_updated', {'amb_id': amb_id, 'status': new_status, 'assigned_victim': assigned_victim})
        return success_response({"status": new_status, "amb_id": amb_id})
    except sqlite3.Error as e:
        if conn: conn.rollback()
        return error_response(str(e))
    finally:
        if conn: conn.close()


@core_api.route('/assign/<victim_id>', methods=['POST'])
@core_api.doc(security=['BearerAuth'], tags=['Dispatch'])
@require_role('responder', 'admin')
def assign_victim(victim_id):
    conn = None
    try:
        conn = get_db_connection()
        victim = conn.execute("SELECT * FROM victims WHERE id = ?", (victim_id,)).fetchone()
        if not victim:
            return error_response("Victim not found", status=404)
        if victim['status'] == 'assigned':
            return success_response({"message": "Already assigned", "victim_id": victim_id})

        conn.execute("UPDATE victims SET status = 'assigned' WHERE id = ?", (victim_id,))

        assigned_amb = None
        if victim['lat'] and victim['lng']:
            assigned_amb = assign_nearest_ambulance(dict(victim), conn)

        conn.commit()
        socketio.emit('victim_assigned', {'victim_id': victim_id, 'ambulance_id': assigned_amb})
        if assigned_amb:
            socketio.emit('ambulance_updated', {'amb_id': assigned_amb, 'status': 'busy', 'assigned_victim': victim_id})
        return success_response({"status": "assigned", "victim_id": victim_id, "ambulance_assigned": assigned_amb})
    except sqlite3.Error as e:
        if conn: conn.rollback()
        return error_response(str(e))
    finally:
        if conn: conn.close()


@core_api.route('/victims/<victim_id>/discharge', methods=['PATCH'])
@core_api.doc(security=['BearerAuth'], tags=['Victims'])
@require_role('responder', 'admin')
def discharge_victim(victim_id):
    conn = None
    try:
        conn = get_db_connection()
        victim = conn.execute("SELECT * FROM victims WHERE id = ?", (victim_id,)).fetchone()
        if not victim:
            return error_response("Victim not found", status=404)
        if victim['status'] == 'discharged':
            return success_response({"message": "Already discharged", "victim_id": victim_id})

        discharged_at = datetime.now().isoformat()
        conn.execute(
            "UPDATE victims SET status = 'discharged', discharged_at = ? WHERE id = ?",
            (discharged_at, victim_id)
        )

        updated_hospital = None
        if victim['hospital_assigned'] and victim['hospital_assigned'] != 'Waitlisted':
            hospital = conn.execute(
                "SELECT * FROM hospitals WHERE name = ?", (victim['hospital_assigned'],)
            ).fetchone()
            if hospital:
                new_beds = min(hospital['available_beds'] + 1, hospital['total_beds'])
                conn.execute(
                    "UPDATE hospitals SET available_beds = ? WHERE id = ?",
                    (new_beds, hospital['id'])
                )
                updated_hospital = {
                    'id': hospital['id'],
                    'name': hospital['name'],
                    'available_beds': new_beds,
                    'total_beds': hospital['total_beds']
                }

        conn.commit()
        socketio.emit('victim_discharged', {
            'victim_id': victim_id,
            'hospital': updated_hospital
        })
        return success_response({
            "status": "discharged",
            "victim_id": victim_id,
            "hospital_beds_updated": updated_hospital
        })
    except sqlite3.Error as e:
        if conn: conn.rollback()
        return error_response(str(e))
    finally:
        if conn: conn.close()


@core_api.route('/hospitals/<int:hospital_id>/replenish', methods=['POST'])
@core_api.doc(security=['BearerAuth'], tags=['Resources'])
@require_role('admin')
def replenish_hospital(hospital_id):
    data = request.json
    if not data or 'beds' not in data:
        return error_response("'beds' field is required", status=400)
    try:
        beds_to_add = int(data['beds'])
        if beds_to_add <= 0:
            return error_response("'beds' must be a positive integer", status=400)
    except (TypeError, ValueError):
        return error_response("'beds' must be an integer", status=400)

    conn = None
    try:
        conn = get_db_connection()
        hospital = conn.execute("SELECT * FROM hospitals WHERE id = ?", (hospital_id,)).fetchone()
        if not hospital:
            return error_response("Hospital not found", status=404)

        new_beds = min(hospital['available_beds'] + beds_to_add, hospital['total_beds'])
        conn.execute("UPDATE hospitals SET available_beds = ? WHERE id = ?", (new_beds, hospital_id))
        conn.commit()
        socketio.emit('hospital_replenished', {'hospital_id': hospital_id, 'available_beds': new_beds})
        return success_response({
            "hospital_id": hospital_id,
            "name": hospital['name'],
            "available_beds": new_beds,
            "total_beds": hospital['total_beds'],
            "beds_added": new_beds - hospital['available_beds']
        })
    except sqlite3.Error as e:
        if conn: conn.rollback()
        return error_response(str(e))
    finally:
        if conn: conn.close()


@core_api.route('/incidents', methods=['GET'])
@core_api.doc(security=['BearerAuth'], tags=['Incidents'])
@require_auth
def get_incidents():
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM incidents ORDER BY created_at DESC').fetchall()
        conn.close()
        return success_response([dict(r) for r in rows])
    except Exception as e:
        return error_response(str(e))


@core_api.route('/incidents', methods=['POST'])
@core_api.doc(security=['BearerAuth'], tags=['Incidents'])
@require_role('admin')
def create_incident():
    try:
        data = request.json
        if not data or 'name' not in data:
            return error_response("'name' field is required", status=400)
        inc_id = f"INC-{uuid.uuid4().hex[6].upper()}"
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO incidents (id, name, type, lat, lng) VALUES (?, ?, ?, ?, ?)',
            (inc_id, data['name'], data.get('type', 'general'), data.get('lat', 13.0827), data.get('lng', 80.2707))
        )
        conn.commit()
        conn.close()
        return success_response({'incident_id': inc_id}, 201)
    except Exception as e:
        return error_response(str(e))


@core_api.route('/victims', methods=['GET'])
@core_api.doc(tags=['Victims'])
def get_victims():
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 200)
        severity = request.args.get('severity')
        status = request.args.get('status')
        incident_id = request.args.get('incident_id')
        
        offset = (page - 1) * limit
        
        query = 'SELECT * FROM victims WHERE 1=1'
        count_query = 'SELECT COUNT(*) FROM victims WHERE 1=1'
        params = []
        
        if incident_id:
            query += ' AND incident_id=?'
            count_query += ' AND incident_id=?'
            params.append(incident_id)
        if severity is not None:
            query += ' AND triage_level=?'
            count_query += ' AND triage_level=?'
            params.append(int(severity))
        if status:
            query += ' AND status=?'
            count_query += ' AND status=?'
            params.append(status)
            
        query += ' ORDER BY triage_level DESC, timestamp ASC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        conn = get_db_connection()
        victims = conn.execute(query, params).fetchall()
        total = conn.execute(count_query, params[:-2]).fetchone()[0]
        conn.close()
        
        return success_response({
            "victims": [dict(row) for row in victims],
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "limit": limit
        })
    except Exception as e:
        return error_response(str(e))


@core_api.route('/clusters', methods=['GET'])
@core_api.doc(security=['BearerAuth'], tags=['Clusters'])
@require_auth
def get_clusters():
    try:
        incident_id = request.args.get('incident_id')
        conn = get_db_connection()
        if incident_id:
            clusters = conn.execute('SELECT * FROM clusters WHERE incident_id=?', (incident_id,)).fetchall()
        else:
            clusters = conn.execute('SELECT * FROM clusters').fetchall()
        conn.close()
        return success_response([dict(row) for row in clusters])
    except Exception as e:
        return error_response(str(e))


@core_api.route('/hospitals', methods=['GET'])
@core_api.doc(security=['BearerAuth'], tags=['Resources'])
@require_auth
def get_hospitals():
    from lib.hospital_service import haversine
    try:
        conn = get_db_connection()
        hospitals = [dict(row) for row in conn.execute('SELECT * FROM hospitals').fetchall()]
        clusters = [dict(row) for row in conn.execute('SELECT lat, lng FROM clusters').fetchall()]
        conn.close()
        result = []
        for h in hospitals:
            if clusters:
                min_dist = min(haversine(h['lat'], h['lng'], c['lat'], c['lng']) for c in clusters)
                h['eta_minutes'] = round((min_dist / 40) * 60, 1)
                h['distance_km'] = round(min_dist, 2)
            else:
                h['eta_minutes'] = None
                h['distance_km'] = None
            result.append(h)
        return success_response(result)
    except Exception as e:
        return error_response(str(e))


@core_api.route('/explain', methods=['POST'])
@core_api.doc(security=['BearerAuth'], tags=['ML'], description='Get SHAP explainability for triage prediction')
@require_role('responder', 'admin')
def explain_triage():
    data = request.json
    if not data:
        return error_response("No data received", status=400)
    required = ['age', 'heart_rate', 'spo2', 'temperature']
    missing = [f for f in required if f not in data]
    if missing:
        return error_response(f"Missing required fields: {missing}", status=400)
    try:
        explanation = get_explanation(
            int(data['age']), float(data['heart_rate']), float(data['spo2']), float(data['temperature'])
        )
        severity, confidence, probabilities = predict_triage(
            int(data['age']), float(data['heart_rate']), float(data['spo2']), float(data['temperature'])
        )
        return success_response({
            "severity": severity,
            "confidence": confidence,
            "probabilities": probabilities,
            "feature_importance": explanation,
        })
    except Exception as e:
        logger.error("SHAP Explanation Error: %s", str(e), exc_info=True)
        return error_response(str(e))


@core_api.route('/victims/<victim_id>/vitals', methods=['POST'])
@core_api.doc(security=['BearerAuth'], tags=['Victims'],
              description='Update victim vitals and trigger re-scoring + re-optimization if severity changes')
@require_role('responder', 'admin')
@rate_limit(max_requests=60, window_seconds=60)
def update_vitals(victim_id):
    data = request.json
    required = ['heart_rate', 'spo2', 'temperature']
    if not data or not all(k in data for k in required):
        return error_response('heart_rate, spo2, temperature required', status=400)

    # Validate
    from validators import validate_vitals_update
    err = validate_vitals_update(data)
    if err:
        return error_response(err, status=422)

    conn = None
    try:
        conn = get_db_connection()
        victim = conn.execute(
            "SELECT * FROM victims WHERE id=?", (victim_id,)
        ).fetchone()
        if not victim:
            return error_response('Victim not found', status=404)
        if victim['status'] == 'discharged':
            return error_response('Victim already discharged', status=400)

        prev_level = victim['triage_level']

        # Re-score
        from ml_model import predict_triage
        new_level, confidence, _ = predict_triage(
            victim['age'],
            float(data['heart_rate']),
            float(data['spo2']),
            float(data['temperature'])
        )
        score_delta = new_level - prev_level

        # Write vitals history
        from datetime import datetime
        now = datetime.now().isoformat()
        conn.execute("""
            INSERT INTO vitals_history
            (victim_id, heart_rate, spo2, temperature, triage_level,
             confidence, prev_triage_level, score_delta, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            victim_id,
            float(data['heart_rate']), float(data['spo2']),
            float(data['temperature']), new_level, confidence,
            prev_level, score_delta, now
        ))

        # Update victim current score
        conn.execute(
            "UPDATE victims SET triage_level=?, confidence=? WHERE id=?",
            (new_level, confidence, victim_id)
        )
        conn.commit()

        # Emit re-score event
        socketio.emit('triage_rescored', {
            'victim_id': victim_id,
            'prev_level': prev_level,
            'new_level': new_level,
            'score_delta': score_delta,
            'confidence': confidence,
            'timestamp': now
        })

        # Trigger re-optimization if score class changed
        reopt_triggered = False
        if abs(score_delta) >= 1:
            from extensions import task_queue
            from lib.dispatch_service import reoptimize_dispatch
            task_queue.submit(
                reoptimize_dispatch,
                args=(victim_id, score_delta),
                name=f'reopt_{victim_id}',
                debounce_key=f'reopt:{victim_id}',
                debounce_seconds=3,
                max_retries=2
            )
            reopt_triggered = True

        return success_response({
            'victim_id': victim_id,
            'prev_triage_level': prev_level,
            'new_triage_level': new_level,
            'score_delta': score_delta,
            'confidence': confidence,
            'reopt_triggered': reopt_triggered
        })

    except Exception as e:
        if conn: conn.rollback()
        return error_response('Internal error', details=str(e), status=500)
    finally:
        if conn: conn.close()


@core_api.route('/victims/<victim_id>/history', methods=['GET'])
@core_api.doc(security=['BearerAuth'], tags=['Victims'],
              description='Return full vitals history and reopt events for a victim')
@require_auth
def get_victim_history(victim_id):
    try:
        conn = get_db_connection()
        victim = conn.execute(
            "SELECT id FROM victims WHERE id=?", (victim_id,)
        ).fetchone()
        if not victim:
            return error_response('Victim not found', status=404)

        vitals = conn.execute("""
            SELECT * FROM vitals_history 
            WHERE victim_id=? ORDER BY recorded_at ASC
        """, (victim_id,)).fetchall()

        reopt = conn.execute("""
            SELECT * FROM reopt_events
            WHERE victim_id=? ORDER BY triggered_at ASC
        """, (victim_id,)).fetchall()

        conn.close()
        return success_response({
            'victim_id': victim_id,
            'vitals_history': [dict(r) for r in vitals],
            'reopt_events': [dict(r) for r in reopt]
        })
    except Exception as e:
        return error_response('Internal error', details=str(e), status=500)


@core_api.route('/incidents/<incident_id>/allocate', methods=['POST'])
@core_api.doc(security=['BearerAuth'], tags=['Dispatch'],
              description='Run cluster-proportional ambulance allocation for an incident')
@require_role('responder', 'admin')
def allocate_clusters(incident_id):
    try:
        conn = get_db_connection()
        inc = conn.execute(
            "SELECT id FROM incidents WHERE id=?", (incident_id,)
        ).fetchone()
        conn.close()
        if not inc:
            return error_response('Incident not found', status=404)

        from lib.dispatch_service import cluster_allocate
        results = cluster_allocate(incident_id)

        return success_response({
            'incident_id': incident_id,
            'clusters_allocated': len(results),
            'allocation': {str(k): v for k, v in results.items()}
        })
    except Exception as e:
        return error_response('Allocation error', details=str(e), status=500)