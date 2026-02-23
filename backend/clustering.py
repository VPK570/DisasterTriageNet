import sqlite3
import numpy as np
from sklearn.cluster import DBSCAN
from math import radians, cos, sin, asin, sqrt

def get_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Kilometers
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    return R * 2 * asin(sqrt(a)) * 1000 # Return in meters

def calculate_hotspots():
    conn = sqlite3.connect('triage.db')
    cursor = conn.cursor()
    
    # Only cluster victims who aren't assigned yet
    cursor.execute("SELECT lat, lng, triage_level FROM victims WHERE status = 'unassigned'")
    data = cursor.fetchall()
    
    if len(data) < 3: return # Need a minimum crowd to form a cluster

    coords = np.array([[row[0], row[1]] for row in data])
    severities = [row[2] for row in data]

    # DBSCAN: eps is the max distance between two points (approx 500m here)
    # min_samples is the minimum victims to qualify as a "Zone"
    db = DBSCAN(eps=0.005, min_samples=3).fit(coords)
    labels = db.labels_

    # Clear old clusters
    cursor.execute("DELETE FROM clusters")

    for cluster_id in set(labels):
        if cluster_id == -1: continue # Ignore noise/outliers
        
        # Get all victims in this specific cluster
        cluster_indices = [i for i, l in enumerate(labels) if l == cluster_id]
        cluster_coords = coords[cluster_indices]
        cluster_severities = [severities[i] for i in cluster_indices]
        
        # 1. Calculate the real center (Mean)
        center_lat = np.mean(cluster_coords[:, 0])
        center_lng = np.mean(cluster_coords[:, 1])
        
        # 2. DYNAMIC RADIUS: Find the distance to the farthest victim in this group
        # We add a small 20m buffer so the circle isn't "tight" on the markers
        max_dist = 0
        for pt in cluster_coords:
            d = get_distance(center_lat, center_lng, pt[0], pt[1])
            if d > max_dist: max_dist = d
        
        dynamic_radius = max_dist + 20 
        avg_severity = np.mean(cluster_severities)

        cursor.execute('''
            INSERT INTO clusters (id, lat, lng, count, avg_severity, radius)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (int(cluster_id), center_lat, center_lng, len(cluster_indices), avg_severity, dynamic_radius))

    conn.commit()
    conn.close()