import requests
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "http://127.0.0.1:5001/api/ingest"
TIMEOUT = 30  # increased since clustering can be slow

def send_victim(i, wave_count):
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
    }

    try:
        response = requests.post(API_URL, json=payload, timeout=TIMEOUT)
        if response.ok:
            result = response.json()
            sev  = result.get('predicted_severity', 'N/A')
            hosp = result.get('assigned_to', 'N/A')
            return f"  ✅ Victim {i+1}: Severity {sev} | Assigned: {hosp}"
        else:
            return f"  ❌ API Error {response.status_code}: {response.text[:80]}"
    except requests.exceptions.Timeout:
        return f"  ⏱️  Victim {i+1}: Timed out (server busy — victim may still be saved)"
    except requests.exceptions.ConnectionError:
        return f"  🔌 Victim {i+1}: Connection refused — is Flask running on port 5001?"

def run_simulator():
    print("🚀 Chennai AI Triage Simulator Started...")
    print(f"📡 Target: {API_URL}")
    print("-" * 57)

    wave_count = 0
    consecutive_failures = 0

    while True:
        wave_count += 1
        num_victims = random.randint(3, 8)
        print(f"\n🌊 [WAVE {wave_count}] Sending {num_victims} victims in parallel...")

        # Send all victims in the wave concurrently instead of sequentially.
        # This prevents one slow response from blocking the rest.
        with ThreadPoolExecutor(max_workers=num_victims) as pool:
            futures = {pool.submit(send_victim, i, wave_count): i for i in range(num_victims)}
            wave_failed = 0
            for future in as_completed(futures):
                msg = future.result()
                print(msg)
                if "Connection refused" in msg:
                    wave_failed += 1

        # Track consecutive total-failure waves to avoid hammering a dead server
        if wave_failed == num_victims:
            consecutive_failures += 1
            if consecutive_failures >= 3:
                print("\n⚠️  Server unreachable for 3 waves. Waiting 30s before retrying...")
                time.sleep(30)
                consecutive_failures = 0
                continue
        else:
            consecutive_failures = 0

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