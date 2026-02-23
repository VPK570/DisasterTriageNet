import sqlite3
import os

DB_PATH = 'triage.db'

def init_db():
    # Remove existing database to ensure a clean slate
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("🗑️ Existing database removed.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Victims Table: Stores patient vitals and ML triage results
    cursor.execute('''
        CREATE TABLE victims (
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

    # 2. Clusters Table: Stores DBSCAN results for the heatmap circles
    cursor.execute('''
        CREATE TABLE clusters (
            id INTEGER PRIMARY KEY,
            lat REAL,
            lng REAL,
            count INTEGER,
            avg_severity REAL,
            radius REAL
        )
    ''')

    # 3. Hospitals Table: Stores locations and bed availability
    cursor.execute('''
        CREATE TABLE hospitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, 
            lat REAL, 
            lng REAL, 
            total_beds INTEGER, 
            available_beds INTEGER, 
            specialty TEXT
        )
    ''')

    # Seed Data: Real Chennai Hospitals
    hospitals = [
        ("Rajiv Gandhi Govt General Hospital", 13.0818, 80.2755, 500, 150, "General Emergency"),
        ("Apollo Main Hospital, Greams Road", 13.0607, 80.2512, 200, 45, "Trauma/Cardiac"),
        ("SIMS Hospital, Vadapalani", 13.0500, 80.2121, 150, 30, "Multi-Specialty"),
        ("Fortis Malar Hospital, Adyar", 13.0067, 80.2578, 120, 20, "Cardiac/Neurology"),
        ("MIOT International, Manapakkam", 13.0205, 80.1865, 250, 60, "Orthopedic/Trauma"),
        ("Stanley Medical College Hospital", 13.1054, 80.2872, 400, 100, "General/Burn Care")
    ]

    cursor.executemany('''
        INSERT INTO hospitals (name, lat, lng, total_beds, available_beds, specialty) 
        VALUES (?, ?, ?, ?, ?, ?)
    ''', hospitals)

    conn.commit()
    conn.close()
    print("✅ Database 'triage.db' successfully initialized with Chennai hospitals.")

if __name__ == "__main__":
    init_db()