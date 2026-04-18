import sqlite3
import numpy as np
import os
from datetime import datetime
from config import DB_PATH, DEFAULT_INCIDENT_ID
from lib.logging_config import get_logger

logger = get_logger('triage.clustering')

DEGREE_TO_KM = 111.0
MIN_SAMPLES = 3
TEMPORAL_DECAY_LAMBDA = 0.01

def get_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2)**2
    return R * 2 * np.arcsin(np.sqrt(a)) * 1000

def _adaptive_eps(coords, min_samples=MIN_SAMPLES):
    """Compute adaptive eps using k-distance graph (k=min_samples)."""
    from sklearn.neighbors import NearestNeighbors
    k = min(min_samples, len(coords))
    k = max(k, 2)
    algorithm = 'brute' if len(coords) < 10 else 'auto'
    nbrs = NearestNeighbors(n_neighbors=k, algorithm=algorithm).fit(coords)
    distances, _ = nbrs.kneighbors(coords)
    k_distances = np.sort(distances[:, -1])
    
    if len(k_distances) < 2:
        return 0.005
    
    elbow_idx = np.argmax(np.diff(k_distances))
    eps = k_distances[elbow_idx]
    
    eps = np.clip(eps, 0.002, 0.015)
    return float(eps)

def _severity_weights(severities):
    return np.array([1.0 + 0.5 * s for s in severities], dtype=np.float64)

def _temporal_weights(timestamps):
    if not timestamps:
        return np.ones(1)
    
    now = datetime.now()
    ages = []
    for ts in timestamps:
        try:
            t = datetime.fromisoformat(ts)
            age_minutes = max((now - t).total_seconds() / 60.0, 0)
        except (ValueError, TypeError):
            age_minutes = 0
        ages.append(age_minutes)
    
    ages = np.array(ages, dtype=np.float64)
    weights = np.exp(-TEMPORAL_DECAY_LAMBDA * ages)
    return weights

def _weighted_dbscan(coords, weights, eps, min_samples=MIN_SAMPLES):
    """Simplified weighted DBSCAN: replicate points by weight bucket.
    
    For publication-grade work, replace with a proper weighted clustering
    library. This approximation gives severity-aware clustering without
    external dependencies beyond scikit-learn.
    """
    from sklearn.cluster import DBSCAN
    
    n = len(coords)
    expanded = []
    original_indices = []
    
    for i in range(n):
        replicas = max(1, int(round(weights[i])))
        for _ in range(replicas):
            expanded.append(coords[i])
            original_indices.append(i)
    
    expanded = np.array(expanded)
    
    db = DBSCAN(eps=eps, min_samples=min_samples, metric='euclidean', n_jobs=1).fit(expanded)
    expanded_labels = db.labels_
    
    labels = np.full(n, -1, dtype=int)
    for idx, orig_idx in enumerate(original_indices):
        if expanded_labels[idx] == -1:
            continue
        if labels[orig_idx] == -1:
            labels[orig_idx] = expanded_labels[idx]
        else:
            labels[orig_idx] = min(labels[orig_idx], expanded_labels[idx])
    
    return labels

def calculate_hotspots(incident_id=DEFAULT_INCIDENT_ID):
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, lat, lng, triage_level, timestamp FROM victims WHERE status = 'unassigned' AND incident_id = ?",
            (incident_id,)
        )
        data = cursor.fetchall()

        if len(data) < MIN_SAMPLES:
            cursor.execute("DELETE FROM clusters WHERE incident_id = ?", (incident_id,))
            conn.commit()
            return

        victim_ids = [row[0] for row in data]
        coords = np.array([[row[1], row[2]] for row in data])
        severities = [row[3] for row in data]
        timestamps = [row[4] for row in data]

        eps = _adaptive_eps(coords)
        logger.info("Adaptive eps=%.4f (%.1fm) for %d victims", eps, eps * DEGREE_TO_KM * 1000, len(data))

        sev_weights = _severity_weights(severities)
        temp_weights = _temporal_weights(timestamps)
        combined_weights = sev_weights * temp_weights

        labels = _weighted_dbscan(coords, combined_weights, eps)

        cursor.execute("DELETE FROM clusters WHERE incident_id = ?", (incident_id,))

        for cluster_id in set(labels):
            if cluster_id == -1:
                continue

            cluster_indices = [i for i, lbl in enumerate(labels) if lbl == cluster_id]
            cluster_coords = coords[cluster_indices]
            cluster_severities = [severities[i] for i in cluster_indices]
            cluster_weights = [combined_weights[i] for i in cluster_indices]

            center_lat = float(np.average(cluster_coords[:, 0], weights=cluster_weights))
            center_lng = float(np.average(cluster_coords[:, 1], weights=cluster_weights))

            max_dist = max(
                (get_distance(center_lat, center_lng, pt[0], pt[1]) for pt in cluster_coords),
                default=0
            )
            dynamic_radius = max_dist + 20
            avg_severity = float(np.average(cluster_severities, weights=cluster_weights))
            total_weight = float(sum(cluster_weights))

            cursor.execute('''
                INSERT INTO clusters (id, lat, lng, count, avg_severity, radius, incident_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (int(cluster_id), center_lat, center_lng, len(cluster_indices), avg_severity, dynamic_radius, incident_id))

            logger.info(
                "Cluster %d: %d victims, avg_severity=%.2f, weight=%.1f, radius=%.0fm",
                cluster_id, len(cluster_indices), avg_severity, total_weight, dynamic_radius
            )

        # Write cluster labels back to victims table
        for victim_id, label in zip(victim_ids, labels):
            cursor.execute(
                "UPDATE victims SET cluster_label=? WHERE id=?",
                (int(label), victim_id)
            )

        conn.commit()
    finally:
        conn.close()
