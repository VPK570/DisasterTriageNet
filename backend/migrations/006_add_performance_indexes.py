def up(cursor):
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_victims_status ON victims(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_victims_incident_id ON victims(incident_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_victims_triage_level ON victims(triage_level)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_victims_timestamp ON victims(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_victims_composite ON victims(incident_id, status, triage_level)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_clusters_incident_id ON clusters(incident_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_hospitals_available_beds ON hospitals(available_beds)')
