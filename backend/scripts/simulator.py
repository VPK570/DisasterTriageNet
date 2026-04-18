import requests
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import DEFAULT_INCIDENT_ID

API_URL = "http://127.0.0.1:5001/api/ingest"
VITALS_URL = "http://127.0.0.1:5001/api/victims/{}/vitals"
LOGIN_URL = "http://127.0.0.1:5001/api/auth/login"
TIMEOUT = 30  # increased since clustering can be slow

# Session-wide auth token
auth_token = None
ingested_victims = []

def login():
    global auth_token
    print("🔑 Authenticating simulator...")
    try:
        payload = {
            "email": "simulator@disaster.net",
            "password": "simulator123"
        }
        response = requests.post(LOGIN_URL, json=payload, timeout=5)
        if response.ok:
            data = response.json()
            auth_token = data.get("access_token")
            print("✅ Login successful.")
        else:
            print(f"❌ Login failed ({response.status_code}): {response.text}")
            exit(1)
    except Exception as e:
        print(f"❌ Connection error during login: {e}")
        exit(1)

def send_victim(i, wave_count):
    global auth_token, ingested_victims
    age = random.randint(1, 90)
    if random.random() > 0.85:
        hr    = random.uniform(120, 160)
        spo2  = random.uniform(70, 89)
        temp  = random.uniform(38.5, 40.0)
    else:
        hr    = random.uniform(60, 100)
        spo2  = random.uniform(94, 100)
        temp  = random.uniform(36.5, 37.5)

    payload = {
        "age":        age,
        "heart_rate": round(hr, 1),
        "spo2":       round(spo2, 1),
        "temperature":round(temp, 1),
        "lat": 13.0827 + random.uniform(-0.06, 0.06),
        "lng": 80.2707 + random.uniform(-0.06, 0.06),
        "incident_id": DEFAULT_INCIDENT_ID
    }

    headers = {
        "Authorization": f"Bearer {auth_token}"
    }

    try:
        response = requests.post(API_URL, json=payload, headers=headers, timeout=TIMEOUT)
        if response.ok:
            result = response.json()
            sev  = result.get('predicted_severity', 'N/A')
            hosp = result.get('assigned_to', 'N/A')
            vid  = result.get('victim_id')
            if vid:
                ingested_victims.append({
                    'id': vid,
                    'hr': hr,
                    'spo2': spo2,
                    'temp': temp
                })
            return f"  ✅ Victim {i+1}: Severity {sev} | Assigned: {hosp}"
        else:
            return f"  ❌ API Error {response.status_code}: {response.text[:80]}"
    except requests.exceptions.Timeout:
        return f"  ⏱️  Victim {i+1}: Timed out (server busy — victim may still be saved)"
    except requests.exceptions.ConnectionError:
        return f"  🔌 Victim {i+1}: Connection refused — is Flask running on port 5001?"

def deteriorate_victims():
    global auth_token, ingested_victims
    if not ingested_victims:
        return

    print(f"\n📉 [DETERIORATION PHASE] Updating {len(ingested_victims)} victims...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    for round_num in range(1, 4):
        print(f"  Round {round_num}/3...")
        for v in ingested_victims:
            # Worsening pattern: heart_rate += 15, spo2 -= 5, temperature += 0.5
            v['hr'] = min(v['hr'] + 15, 220)
            v['spo2'] = max(v['spo2'] - 5, 60)
            v['temp'] = min(v['temp'] + 0.5, 42)
            
            try:
                url = VITALS_URL.format(v['id'])
                res = requests.post(url, json={
                    'heart_rate': round(v['hr'], 1),
                    'spo2': round(v['spo2'], 1),
                    'temperature': round(v['temp'], 1)
                }, headers=headers, timeout=5)
                if res.ok:
                    data = res.json()
                    reopt = "🔥 REOPT" if data.get('reopt_triggered') else "ok"
                    print(f"    - {v['id']}: HR={round(v['hr'],1)} SpO2={round(v['spo2'],1)} | {reopt}")
                else:
                    print(f"    - {v['id']}: Failed ({res.status_code})")
            except Exception as e:
                print(f"    - {v['id']}: Error {e}")
        
        if round_num < 3:
            time.sleep(5)

def run_simulator():
    login()
    print("🚀 Chennai AI Triage Simulator Started...")
    print(f"📡 Target: {API_URL}")
    print("-" * 57)

    wave_count = 0
    consecutive_failures = 0

    while True:
        wave_count += 1
        num_victims = random.randint(3, 8)
        print(f"\n🌊 [WAVE {wave_count}] Sending {num_victims} victims in parallel...")

        with ThreadPoolExecutor(max_workers=num_victims) as pool:
            futures = {pool.submit(send_victim, i, wave_count): i for i in range(num_victims)}
            wave_failed = 0
            for future in as_completed(futures):
                msg = future.result()
                print(msg)
                if "Connection refused" in msg:
                    wave_failed += 1

        if wave_failed == num_victims:
            consecutive_failures += 1
            if consecutive_failures >= 3:
                print("\n⚠️  Server unreachable for 3 waves. Waiting 30s before retrying...")
                time.sleep(30)
                consecutive_failures = 0
                continue
        else:
            consecutive_failures = 0

        # Trigger deterioration phase every 3 waves
        if wave_count % 3 == 0:
            deteriorate_victims()

        sleep_time = random.randint(8, 15)
        print(f"⏳ Next wave in {sleep_time}s...")
        try:
            time.sleep(sleep_time)
        except KeyboardInterrupt:
            print("\n🛑 Simulator stopped.")
            break

if __name__ == "__main__":
    try:
        run_simulator()
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")

if __name__ == "__main__":
    try:
        run_simulator()
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")