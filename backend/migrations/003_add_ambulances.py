def up(cursor):
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ambulances (
            id TEXT PRIMARY KEY,
            status TEXT DEFAULT 'available',
            location TEXT,
            lat REAL,
            lng REAL,
            assigned_victim TEXT DEFAULT NULL
        )
    ''')
