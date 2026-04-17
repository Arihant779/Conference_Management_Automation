import requests

def test_invalid_login():
    print("TC 02: Invalid Login Blocked")
    data = {"username": "user", "password": "wrong"}
    try:
        response = requests.post("http://localhost:5000/login", data=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print("PASS: Unauthorized (blocked)")
        else:
            print(f"FAIL: Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_invalid_login()
