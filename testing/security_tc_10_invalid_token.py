import requests

def test_invalid_token():
    print("TC 10: Session / Token Validation")
    headers = {"Authorization": "Bearer INVALID_TOKEN"}
    try:
        response = requests.get("http://localhost:5000/dashboard", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print("PASS: Invalid token rejected")
        else:
            print(f"FAIL: Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_invalid_token()
