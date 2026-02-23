import sqlite3
import random
import uuid
import time
from datetime import datetime
from clustering import calculate_hotspots

# Chennai Center
BASE_LAT, BASE_LNG = 13.0827, 80.2707

def add_random_victims():
    conn = sqlite3.connect('triage.db')
    cursor = conn.cursor()
    
    # 1. ENSURE THE TABLE EXISTS (This fixes your error)
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
            status TEXT
        )
    ''')
    
    # 2. Randomly decide how many people were just reported (1 to 5)
    num_people = random.randint(1, 5)
    
    for _ in range(num_people):
        v_id = f"CHN-{uuid.uuid4().hex[:5].upper()}"
        age = random.randint(1, 90)
        
        severity = random.choices([0, 1, 2, 3], weights=[50, 25, 15, 10])[0]
        
        if severity == 3:
            hr, spo2, temp = random.uniform(140, 168), random.uniform(70, 84), random.uniform(39.1, 40.5)
        elif severity == 2:
            hr, spo2, temp = random.uniform(120, 140), random.uniform(85, 89), random.uniform(38.1, 39.0)
        else:
            hr, spo2, temp = random.uniform(65, 110), random.uniform(90, 100), random.uniform(36.5, 37.8)

        lat = BASE_LAT + random.uniform(-0.06, 0.06)
        lng = BASE_LNG + random.uniform(-0.06, 0.06)

        cursor.execute('''
            INSERT INTO victims VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (v_id, age, round(hr, 1), round(spo2, 1), round(temp, 1), 
              severity, lat, lng, datetime.now().isoformat(), "unassigned"))
    
    conn.commit()
    conn.close()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🚨 Added {num_people} new victims near Chennai.")

if __name__ == "__main__":
    print("🚀 Starting Live Disaster Simulator for Chennai...")
    while True:
        add_random_victims()
        
        # ADD THIS LINE: Run clustering after adding victims
        try:
            calculate_hotspots()
        except Exception as e:
            print(f"Clustering error: {e}")
            
        wait_time = random.randint(3, 10)
        time.sleep(wait_time)