from math import radians, cos, sin, asin, sqrt
from lib.db import get_db_connection

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    return R * (2 * asin(sqrt(a)))

def match_hospital(victim_lat, victim_lng):
    from logging_config import get_logger
    logger = get_logger('triage.hospital_service')
    try:
        conn = get_db_connection()
        hospitals = conn.execute('SELECT * FROM hospitals WHERE available_beds > 0').fetchall()
        conn.close()
        best_hospital = None
        min_distance = float('inf')
        for h in hospitals:
            dist = haversine(victim_lat, victim_lng, h['lat'], h['lng'])
            if dist < min_distance:
                min_distance = dist
                best_hospital = h
        return best_hospital
    except Exception as e:
        logger.error("Hospital Match Error: %s", str(e), exc_info=True)
        return None