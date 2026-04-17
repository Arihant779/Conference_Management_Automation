import requests

def test_idor_attack():
    print("TC 11: IDOR Attack (Insecure Direct Object Reference)")
    
    # Assume user is logged in and has token
    headers = {"Authorization": "Bearer USER_TOKEN"}

    # Try accessing another user's paper (change ID to 999)
    try:
        response = requests.get("http://localhost:5000/paper/999", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 403:
            print("PASS: IDOR attempt blocked (Access denied)")
        else:
            print(f"FAIL: Expected 403, got {response.status_code}")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_idor_attack()
