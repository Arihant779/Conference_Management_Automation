import requests

def test_admin_allowed():
    print("TC 05: Admin Access Allowed")
    headers = {"Authorization": "Bearer ADMIN_TOKEN"}
    try:
        response = requests.get("http://localhost:5000/admin", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("PASS: Access granted for Admin")
        else:
            print(f"FAIL: Expected 200, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_admin_allowed()
