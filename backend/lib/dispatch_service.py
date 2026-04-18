from lib.db import get_db_connection
from lib.hospital_service import haversine
from lib.extensions import socketio
from datetime import datetime
import logging

logger = logging.getLogger('triage.dispatch')

SEVERITY_WEIGHT = 2.0
DISTANCE_WEIGHT = 1.0
EPSILON = 0.1
REOPT_DELTA_THRESHOLD = 1  # score class change needed to trigger reopt


def assign_nearest_ambulance(victim, conn):
    """
    Severity-weighted ambulance assignment.
    Score = triage_level * SEVERITY_WEIGHT / (distance * DISTANCE_WEIGHT + EPSILON)
    Returns assigned ambulance id or None.
    """
    ambulances = conn.execute(
        "SELECT * FROM ambulances WHERE status = 'available'"
    ).fetchall()

    if not ambulances or not victim['lat'] or not victim['lng']:
        return None

    def score(amb):
        dist = haversine(
            victim['lat'], victim['lng'], amb['lat'], amb['lng']
        )
        return (victim['triage_level'] * SEVERITY_WEIGHT) / \
               (dist * DISTANCE_WEIGHT + EPSILON)

    best = max(ambulances, key=score)
    conn.execute(
        "UPDATE ambulances SET status='busy', assigned_victim=? WHERE id=?",
        (victim['id'], best['id'])
    )
    return best['id']


def reoptimize_dispatch(victim_id, score_delta, trigger_reason='vitals_update'):
    """
    Re-evaluate ambulance assignment for a victim whose triage score changed.
    Logs to reopt_events. Emits ambulance_updated via WebSocket.
    """
    conn = None
    try:
        conn = get_db_connection()
        victim = conn.execute(
            "SELECT * FROM victims WHERE id=?", (victim_id,)
        ).fetchone()

        if not victim or victim['status'] == 'discharged':
            return

        # Free current ambulance if assigned
        old_amb = conn.execute(
            "SELECT id FROM ambulances WHERE assigned_victim=? AND status='busy'",
            (victim_id,)
        ).fetchone()
        old_amb_id = old_amb['id'] if old_amb else None

        if old_amb_id:
            conn.execute(
                "UPDATE ambulances SET status='available', assigned_victim=NULL WHERE id=?",
                (old_amb_id,)
            )

        # Re-assign with severity-weighted scoring
        new_amb_id = assign_nearest_ambulance(victim, conn)

        # Log reopt event
        conn.execute("""
            INSERT INTO reopt_events 
            (victim_id, trigger_reason, old_ambulance_id, new_ambulance_id,
             triage_level_at_trigger, score_delta, triggered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            victim_id, trigger_reason, old_amb_id, new_amb_id,
            victim['triage_level'], score_delta,
            datetime.now().isoformat()
        ))

        # Mark latest vitals_history row as reopt_triggered
        # Note: SQLite doesn't support ORDER BY in UPDATE directly in standard build
        # We'll use a subquery for the row ID.
        conn.execute("""
            UPDATE vitals_history SET reopt_triggered=1
            WHERE id = (
                SELECT id FROM vitals_history 
                WHERE victim_id=? 
                ORDER BY recorded_at DESC LIMIT 1
            )
        """, (victim_id,))

        conn.commit()

        socketio.emit('ambulance_updated', {
            'amb_id': new_amb_id,
            'status': 'busy',
            'assigned_victim': victim_id,
            'reoptimized': True,
            'old_ambulance': old_amb_id
        })
        logger.info(
            "Reopt: victim=%s delta=%.1f old_amb=%s new_amb=%s",
            victim_id, score_delta, old_amb_id, new_amb_id
        )

    except Exception as e:
        if conn: conn.rollback()
        logger.error("Reopt error for %s: %s", victim_id, str(e), exc_info=True)
    finally:
        if conn: conn.close()


def cluster_allocate(incident_id):
    """
    Allocates available ambulances across active victim clusters
    proportional to each cluster's severity mass.
    
    severity_mass(cluster) = sum of triage_level of all victims in cluster
    ambulances_for_cluster = round(total_available * mass / total_mass)
    
    Within each cluster, assigns ambulances using existing
    assign_nearest_ambulance() with severity-weighted scoring.
    
    Returns dict: {cluster_id: [ambulance_ids assigned]}
    """
    conn = None
    try:
        conn = get_db_connection()

        # Fetch active clusters for incident
        clusters = conn.execute("""
            SELECT * FROM clusters 
            WHERE incident_id = ?
        """, (incident_id,)).fetchall()

        if not clusters:
            logger.info("cluster_allocate: no clusters for incident %s", incident_id)
            return {}

        # Fetch all available ambulances
        available = conn.execute(
            "SELECT * FROM ambulances WHERE status = 'available'"
        ).fetchall()

        if not available:
            logger.info("cluster_allocate: no available ambulances")
            return {}

        total_available = len(available)

        # Compute severity mass per cluster
        # Fetch unassigned victims per cluster grouped by cluster_label
        cluster_victims = {}
        rows = conn.execute("""
            SELECT cluster_label, id, triage_level, lat, lng
            FROM victims
            WHERE incident_id = ? 
            AND status = 'unassigned'
            AND cluster_label IS NOT NULL
            AND cluster_label != -1
        """, (incident_id,)).fetchall()

        for row in rows:
            label = row['cluster_label']
            if label not in cluster_victims:
                cluster_victims[label] = []
            cluster_victims[label].append(dict(row))

        if not cluster_victims:
            logger.info("cluster_allocate: no unassigned victims in clusters")
            return {}

        # Compute severity mass per cluster
        mass = {
            label: sum(v['triage_level'] for v in victims)
            for label, victims in cluster_victims.items()
        }
        total_mass = sum(mass.values())

        if total_mass == 0:
            return {}

        # Allocate ambulance count per cluster proportional to mass
        allocation = {}
        for label, m in mass.items():
            allocation[label] = max(1, round(total_available * m / total_mass))

        # Cap total allocation to available ambulances
        # If over-allocated due to rounding, trim from lowest mass cluster
        while sum(allocation.values()) > total_available:
            lowest = min(allocation, key=lambda k: mass[k])
            allocation[lowest] = max(0, allocation[lowest] - 1)
            if allocation[lowest] == 0:
                del allocation[lowest]

        # Assign ambulances within each cluster
        results = {}
        for label, count in allocation.items():
            victims = sorted(
                cluster_victims[label],
                key=lambda v: v['triage_level'],
                reverse=True  # highest severity first
            )
            assigned = []
            for victim in victims[:count]:
                victim_row = conn.execute(
                    "SELECT * FROM victims WHERE id=?", (victim['id'],)
                ).fetchone()
                amb_id = assign_nearest_ambulance(victim_row, conn)
                if amb_id:
                    assigned.append(amb_id)
                    conn.execute(
                        "UPDATE victims SET status='assigned' WHERE id=?",
                        (victim['id'],)
                    )
                # Log to cluster_allocation_log
                conn.execute("""
                    INSERT INTO cluster_allocation_log 
                    (incident_id, cluster_label, severity_mass, ambulances_allocated, victims_assigned, allocated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    incident_id, label, mass[label], len(assigned), len(assigned), datetime.now().isoformat()
                ))
            results[label] = assigned
            conn.commit()

        # Emit cluster allocation event
        socketio.emit('cluster_allocated', {
            'incident_id': incident_id,
            'allocation': {
                str(k): v for k, v in results.items()
            },
            'severity_mass': {
                str(k): v for k, v in mass.items()
            }
        })

        logger.info(
            "cluster_allocate: incident=%s clusters=%d ambulances_dispatched=%d",
            incident_id, len(results), sum(len(v) for v in results.values())
        )
        return results

    except Exception as e:
        if conn: conn.rollback()
        logger.error("cluster_allocate error: %s", str(e), exc_info=True)
        return {}
    finally:
        if conn: conn.close()