import os
import sys

sys.path.append(os.path.dirname(__file__))
from config import DB_PATH, DEFAULT_INCIDENT_ID, DEFAULT_INCIDENT_NAME
from migrations.runner import run_migrations
import sqlite3
from lib.logging_config import get_logger

logger = get_logger('triage.setup')

def init_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    run_migrations()
    seed_data()

def seed_data():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=5000')
    cursor = conn.cursor()

    cursor.execute(
        'INSERT OR IGNORE INTO incidents (id, name, type, lat, lng) VALUES (?, ?, ?, ?, ?)',
        (DEFAULT_INCIDENT_ID, DEFAULT_INCIDENT_NAME, 'flood', 13.0827, 80.2707)
    )

    import bcrypt
    import uuid
    from datetime import datetime, timezone

    system_users = [
        (str(uuid.uuid4()), "Simulator Bot", "simulator@disaster.net", bcrypt.hashpw("simulator123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'), "responder", datetime.now(timezone.utc).isoformat()),
        (str(uuid.uuid4()), "System Admin", "admin@disaster.net", bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'), "admin", datetime.now(timezone.utc).isoformat())
    ]

    cursor.executemany('''
        INSERT OR IGNORE INTO users (id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', system_users)

    hospitals = [
        ("Rajiv Gandhi Govt General Hospital", 13.0818, 80.2755, 500, 150, "General Emergency"),
        ("Apollo Main Hospital, Greams Road",  13.0607, 80.2512, 200,  45, "Trauma/Cardiac"),
        ("SIMS Hospital, Vadapalani",          13.0500, 80.2121, 150,  30, "Multi-Specialty"),
        ("Fortis Malar Hospital, Adyar",       13.0067, 80.2578, 120,  20, "Cardiac/Neurology"),
        ("MIOT International, Manapakkam",     13.0205, 80.1865, 250,  60, "Orthopedic/Trauma"),
        ("Stanley Medical College Hospital",   13.1054, 80.2872, 400, 100, "General/Burn Care"),
    ]
    cursor.executemany('''
        INSERT INTO hospitals (name, lat, lng, total_beds, available_beds, specialty)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', hospitals)

    ambulances = [
        ("AMB-01", "available", "Adyar",    13.0012, 80.2565, None),
        ("AMB-02", "busy",      "T. Nagar", 13.0418, 80.2341, None),
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO ambulances (id, status, location, lat, lng, assigned_victim)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ambulances)

    conn.commit()
    conn.close()
    logger.info("Database '%s' initialized and seeded with default data.", DB_PATH)

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--fresh':
        confirm = input("WARNING: This will drop all tables and completely permanently erase all data. Proceed? [y/N]: ")
        if confirm.lower() == 'y':
            logger.info("Running fresh install...")
            init_db()
            logger.info("Fresh database created and seeded.")
        else:
            logger.info("Aborted.")
    else:
        logger.info("Running standard db migrations...")
        run_migrations()