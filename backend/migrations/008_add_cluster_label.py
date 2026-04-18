def up(cursor):
    cursor.executescript("""
        ALTER TABLE victims ADD COLUMN cluster_label INTEGER DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_victims_cluster 
            ON victims(cluster_label, incident_id);
    """)