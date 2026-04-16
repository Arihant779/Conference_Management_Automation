import requests

def test_no_auth():
    print("TC 03: Access Without Login")
    try:
        response = requests.get("http://localhost:5000/dashboard")
        print(f"Status: {response.status_code}")
        if response.status_code in [401, 403]:
            print("PASS: Access blocked without authentication")
        else:
            print(f"FAIL: Expected 401 or 403, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_no_auth()
