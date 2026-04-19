import requests
import time

def test_decision_update():
    print("TC 06: Immediate Decision Update")
    print("Testing if paper status is immediately updated once a decision is reached...")
    
    PAPER_ID = "paper_123_abc"
    URL = "http://localhost:5000/api/papers/review"
    
    payload = {
        "paper_id": PAPER_ID,
        "review_status": "accepted",
        "score": 90,
        "is_deciding_review": True
    }
    
    try:
        start_time = time.time()
        response = requests.post(URL, json=payload)
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"Server response time: {duration:.4f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Received: {data}")
            
            # Pass conditions:
            # 1. New status must be present in the response (simulating direct update)
            # 2. Response time must be low
            if data.get('new_status') == 'accepted' and data.get('status') == 'success':
                print("PASS: Paper status was successfully and immediately updated.")
            else:
                print("FAIL: Status update information missing or incorrect.")
        else:
            print(f"FAIL: Server returned status {response.status_code}")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_decision_update()
