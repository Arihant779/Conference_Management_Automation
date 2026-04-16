import time
import requests
import io
import json
from config import BASE_URL, ALLOCATION_URL, THRESHOLD_UPLOAD, THRESHOLD_EMAIL, THRESHOLD_DASHBOARD, TEST_USER_ID

def test_paper_upload_performance():
    """Requirement: Paper Upload <= 5 sec (PDF <= 20MB)"""
    print("\n--- Testing Paper Upload Performance ---")
    
    # Create a dummy 1MB PDF content (simulating larger is possible but 1MB is safer for quick test)
    # The requirement is 20MB, but for manual run we can scale down or up.
    dummy_pdf = io.BytesIO(b"%PDF-1.4\n" + b"0" * (1024 * 1024)) # 1MB dummy
    files = {'papers[]': ('test.pdf', dummy_pdf, 'application/pdf')}
    data = {
        'reviewers': json.dumps([{"name": "Test Reviewer", "expertise": "AI"}]),
        'reviewers_per_paper': 1
    }
    
    start_time = time.time()
    try:
        res = requests.post(f"{ALLOCATION_URL}/allocate-papers", files=files, data=data)
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"Status Code: {res.status_code}")
        print(f"Upload Duration: {duration:.2f}s")
        
        if duration <= THRESHOLD_UPLOAD:
            print("[PASS] Upload performance within limits.")
        else:
            print(f"[FAIL] Upload performance exceeded limit ({THRESHOLD_UPLOAD}s).")
    except Exception as e:
        print(f"[ERROR] Upload test failed: {e}")

def test_email_trigger_performance():
    """Requirement: Email Trigger <= 3 sec"""
    print("\n--- Testing Email Trigger Performance ---")
    
    payload = {
        "to": ["test@example.com"],
        "subject": "Performance Test",
        "body": "This is a performance test email trigger."
    }
    
    start_time = time.time()
    try:
        # Using the main backend endpoint
        res = requests.post(f"{BASE_URL}/send-email", json=payload)
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"Status Code: {res.status_code}")
        print(f"Trigger Duration: {duration:.2f}s")
        
        if duration <= THRESHOLD_EMAIL:
            print("[PASS] Email trigger performance within limits.")
        else:
            print(f"[FAIL] Email trigger performance exceeded limit ({THRESHOLD_EMAIL}s).")
    except Exception as e:
        print(f"[ERROR] Email trigger test failed: {e}")

def test_dashboard_load_performance():
    """Requirement: Dashboard Load <= 3 sec (95% users)"""
    print("\n--- Testing Dashboard Load Performance ---")
    
    start_time = time.time()
    try:
        # Targeting the unified user-hub statistics endpoint
        res = requests.get(f"{BASE_URL}/dashboards/user-hub/{TEST_USER_ID}")
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"Status Code: {res.status_code}")
        print(f"Load Duration: {duration:.2f}s")
        
        if duration <= THRESHOLD_DASHBOARD:
            print("[PASS] Dashboard load performance within limits.")
        else:
            print(f"[FAIL] Dashboard load performance exceeded limit ({THRESHOLD_DASHBOARD}s).")
    except Exception as e:
        print(f"[ERROR] Dashboard load test failed: {e}")

if __name__ == "__main__":
    test_paper_upload_performance()
    test_email_trigger_performance()
    test_dashboard_load_performance()
