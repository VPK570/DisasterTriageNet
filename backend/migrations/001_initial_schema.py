def up(cursor):
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            status TEXT DEFAULT 'active',
            lat REAL,
            lng REAL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS victims (
            id TEXT PRIMARY KEY, 
            age INTEGER, 
            heart_rate REAL, 
            spo2 REAL, 
            temperature REAL, 
            triage_level INTEGER,
            lat REAL, 
            lng REAL, 
            timestamp TEXT, 
            status TEXT,
            hospital_assigned TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clusters (
            id INTEGER PRIMARY KEY,
            lat REAL,
            lng REAL,
            count INTEGER,
            avg_severity REAL,
            radius REAL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hospitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, 
            lat REAL, 
            lng REAL, 
            total_beds INTEGER, 
            available_beds INTEGER, 
            specialty TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password_hash TEXT,
            role TEXT,
            created_at TEXT
        )
    ''')
