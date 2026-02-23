import sqlite3
import pandas as pd
from sklearn.cluster import KMeans

def calculate_hotspots():
    conn = sqlite3.connect('triage.db')
    # We only cluster unassigned victims who still need help
    df = pd.read_sql_query("SELECT id, lat, lng, triage_level FROM victims WHERE status = 'unassigned'", conn)
    
    if len(df) < 3: 
        conn.close()
        return

    # K-Means: Create a cluster for every 10-15 victims
    num_clusters = max(1, len(df) // 10)
    kmeans = KMeans(n_clusters=num_clusters, n_init=10)
    df['cluster'] = kmeans.fit_predict(df[['lat', 'lng']])
    
    # Get center points and counts
    centers = kmeans.cluster_centers_
    cursor = conn.cursor()
    cursor.execute('DROP TABLE IF EXISTS clusters')
    cursor.execute('CREATE TABLE clusters (id INTEGER, lat REAL, lng REAL, count INTEGER, avg_severity REAL)')
    
    for i, center in enumerate(centers):
        cluster_data = df[df['cluster'] == i]
        cursor.execute('INSERT INTO clusters VALUES (?, ?, ?, ?, ?)',
                       (i, center[0], center[1], len(cluster_data), cluster_data['triage_level'].mean()))
    
    conn.commit()
    conn.close()
    print(f"✅ Generated {num_clusters} tactical clusters.")

if __name__ == "__main__":
    calculate_hotspots()