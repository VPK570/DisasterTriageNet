import requests
import random
import time
from datetime import datetime

# CONFIGURATION
# Using 127.0.0.1 and Port 5001 for Mac compatibility
API_URL = "http://127.0.0.1:5001/api/ingest"

def run_simulator():
    print("🚀 Chennai AI Triage Simulator (Looping Edition) Started...")
    print(f"📡 Sending data to: {API_URL}")
    print("---------------------------------------------------------")
    
    wave_count = 0

    # INFINITE LOOP: This ensures the simulation repeats
    while True:
        wave_count += 1
        try:
            # Decide how many victims appear in this specific time window
            num_victims = random.randint(3, 8)
            print(f"\n🌊 [WAVE {wave_count}] Simulating {num_victims} new victims...")
            
            for i in range(num_victims):
                # GENERATE RAW VITALS
                age = random.randint(1, 90)
                
                # Triage Logic for Simulation: 
                # 15% chance of a high-priority "Emergency" case
                if random.random() > 0.85:
                    hr = random.uniform(120, 160)
                    spo2 = random.uniform(70, 89)
                    temp = random.uniform(38.5, 40.0)
                else:
                    hr = random.uniform(60, 100)
                    spo2 = random.uniform(94, 100)
                    temp = random.uniform(36.5, 37.5)

                # GEOLOCATION: Focused around Chennai center
                lat = 13.0827 + random.uniform(-0.06, 0.06)
                lng = 80.2707 + random.uniform(-0.06, 0.06)

                # PREPARE PAYLOAD
                payload = {
                    "age": age,
                    "heart_rate": round(hr, 1),
                    "spo2": round(spo2, 1),
                    "temperature": round(temp, 1),
                    "lat": lat,
                    "lng": lng
                }

                # SEND POST REQUEST
                # Timeout=5 ensures the script doesn't hang if the DB is locked
                response = requests.post(API_URL, json=payload, timeout=15)
                
                if response.ok:
                    result = response.json()
                    sev = result.get('predicted_severity', 'N/A')
                    hosp = result.get('assigned_to', 'N/A')
                    print(f"  ✅ Victim {i+1}: Severity {sev} | Assigned: {hosp}")
                else:
                    print(f"  ❌ API Error {response.status_code}: {response.text}")

            # DELAY BETWEEN WAVES
            # Adjust this to change how fast your map fills up
            sleep_time = random.randint(8, 15)
            print(f"⏳ Waiting {sleep_time} seconds before next wave...")
            time.sleep(sleep_time)

        except requests.exceptions.ConnectionError:
            print("⚠️  CONNECTION REFUSED: Is your Flask server running on port 5001?")
            time.sleep(5) # Wait before trying to reconnect
            
        except KeyboardInterrupt:
            print("\n🛑 Simulator stopped by user.")
            break
            
        except Exception as e:
            print(f"🛑 UNEXPECTED ERROR: {e}")
            time.sleep(5)

if __name__ == "__main__":
    run_simulator()