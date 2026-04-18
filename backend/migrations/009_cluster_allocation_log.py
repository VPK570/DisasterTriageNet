def up(cursor):
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS cluster_allocation_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            cluster_label INTEGER NOT NULL,
            severity_mass REAL NOT NULL,
            ambulances_allocated INTEGER NOT NULL,
            victims_assigned INTEGER NOT NULL,
            allocated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cluster_alloc_incident
            ON cluster_allocation_log(incident_id);
    """)