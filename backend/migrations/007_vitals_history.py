def up(cursor):
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS vitals_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            victim_id TEXT NOT NULL,
            heart_rate REAL NOT NULL,
            spo2 REAL NOT NULL,
            temperature REAL NOT NULL,
            triage_level INTEGER NOT NULL,
            confidence REAL NOT NULL,
            prev_triage_level INTEGER,
            score_delta REAL,
            recorded_at TEXT NOT NULL,
            reopt_triggered INTEGER DEFAULT 0,
            FOREIGN KEY (victim_id) REFERENCES victims(id)
        );

        CREATE TABLE IF NOT EXISTS reopt_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            victim_id TEXT NOT NULL,
            trigger_reason TEXT NOT NULL,
            old_ambulance_id TEXT,
            new_ambulance_id TEXT,
            triage_level_at_trigger INTEGER,
            score_delta REAL,
            triggered_at TEXT NOT NULL,
            FOREIGN KEY (victim_id) REFERENCES victims(id)
        );

        CREATE INDEX IF NOT EXISTS idx_vitals_victim 
            ON vitals_history(victim_id);
        CREATE INDEX IF NOT EXISTS idx_vitals_recorded 
            ON vitals_history(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_reopt_victim 
            ON reopt_events(victim_id);
    """)
