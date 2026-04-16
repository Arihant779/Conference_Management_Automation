import requests
import time
from config import BASE_URL, ALLOCATION_URL

def check_system_availability():
    """Requirement: System Available 24x7"""
    print("\n--- Checking Main System Availability ---")
    # Clean the BASE_URL to get the root for /health
    # BASE_URL is http://localhost:4000/api
    root_url = BASE_URL.replace("/api", "")
    
    try:
        res = requests.get(f"{root_url}/health")
        if res.status_code == 200:
            print(f"[PASS] Main System is UP. Response: {res.json()}")
        else:
            print(f"[FAIL] Main System returned status {res.status_code}")
    except Exception as e:
        print(f"[ERROR] Main System is DOWN: {e}")

def check_background_services():
    """Requirement: Background Services Run Continuously"""
    print("\n--- Checking Background Services ---")
    
    # 1. Check Flask Allocation Service
    # ALLOCATION_URL is http://localhost:5000/api
    alloc_root = ALLOCATION_URL.replace("/api", "")
    try:
        res = requests.get(f"{alloc_root}/health")
        if res.status_code == 200:
            print(f"[PASS] Allocation Microservice is UP. Response: {res.json()}")
        else:
            print(f"[FAIL] Allocation Microservice returned status {res.status_code}")
    except Exception as e:
        print(f"[ERROR] Allocation Microservice is DOWN: {e}")

    # 2. Check LLM Integration (part of background intelligence)
    root_url = BASE_URL.replace("/api", "")
    try:
        res = requests.get(f"{root_url}/health")
        health = res.json()
        if "llm" in health and "Groq" in health["llm"]:
            print("[PASS] LLM Service Connection is active.")
        else:
            print(f"[WARN] LLM Service might be misconfigured: {health.get('llm')}")
    except:
        pass

def run_heartbeat_monitor(duration_seconds=10, interval=2):
    """A simple loop to simulate 24x7 monitoring"""
    print(f"\n--- Starting Heartbeat Monitor (Running for {duration_seconds}s) ---")
    start = time.time()
    while time.time() - start < duration_seconds:
        root_url = BASE_URL.replace("/api", "")
        try:
            res = requests.get(f"{root_url}/health")
            print(f"[{time.strftime('%H:%M:%S')}] Heartbeat OK (Status {res.status_code})")
        except:
            print(f"[{time.strftime('%H:%M:%S')}] Heartbeat FAILED")
        time.sleep(interval)
    print("Monitor finished.")

if __name__ == "__main__":
    check_system_availability()
    check_background_services()
    run_heartbeat_monitor()
