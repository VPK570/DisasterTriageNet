import sqlite3
import numpy as np
import os
from sklearn.cluster import DBSCAN
from joblib import parallel_backend
from math import radians, cos, sin, asin, sqrt

# Standardize DB path to match app.py
DB_PATH = os.path.join(os.path.dirname(__file__), 'triage.db')

def get_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Kilometers
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    return R * 2 * asin(sqrt(a)) * 1000 # Return in meters

def calculate_hotspots(incident_id='INC-001'):
    conn = sqlite3.connect(DB_PATH, timeout=30)
    cursor = conn.cursor()
    
    # Only cluster victims who aren't assigned yet for this incident
    cursor.execute("SELECT lat, lng, triage_level FROM victims WHERE status = 'unassigned' AND incident_id = ?", (incident_id,))
    data = cursor.fetchall()
    
    if len(data) < 3: 
        conn.close()
        return

    coords = np.array([[row[0], row[1]] for row in data])
    severities = [row[2] for row in data]

    # Force threading backend to prevent semaphore leaks and Eventlet conflicts
    db = DBSCAN(eps=0.005, min_samples=3, n_jobs=1).fit(coords)
    labels = db.labels_

    # Clear old clusters for THIS incident only
    cursor.execute("DELETE FROM clusters WHERE incident_id = ?", (incident_id,))

    for cluster_id in set(labels):
        if cluster_id == -1: continue # Ignore noise/outliers
        
        cluster_indices = [i for i, l in enumerate(labels) if l == cluster_id]
        cluster_coords = coords[cluster_indices]
        cluster_severities = [severities[i] for i in cluster_indices]
        
        center_lat = np.mean(cluster_coords[:, 0])
        center_lng = np.mean(cluster_coords[:, 1])
        
        max_dist = 0
        for pt in cluster_coords:
            d = get_distance(center_lat, center_lng, pt[0], pt[1])
            if d > max_dist: max_dist = d
        
        dynamic_radius = max_dist + 20 
        avg_severity = np.mean(cluster_severities)

        cursor.execute('''
            INSERT INTO clusters (id, lat, lng, count, avg_severity, radius, incident_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (int(cluster_id), center_lat, center_lng, len(cluster_indices), avg_severity, dynamic_radius, incident_id))

    conn.commit()
    conn.close()