import requests

def test_unauthorized_data():
    print("TC 06: Unauthorized Data Access (Paper/Review)")
    try:
        response = requests.get("http://localhost:5000/paper/123")
        print(f"Status: {response.status_code}")
        if response.status_code == 403:
            print("PASS: Access denied for other user's data")
        else:
            print(f"FAIL: Expected 403, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_unauthorized_data()
