import requests

def test_rbac_forbidden():
    print("TC 04: Role-Based Access Control (User -> Admin Page)")
    # Headers without Admin Token (or using USER_TOKEN)
    headers = {"Authorization": "Bearer USER_TOKEN"}
    try:
        response = requests.get("http://localhost:5000/admin", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 403:
            print("PASS: Forbidden (RBAC works)")
        else:
            print(f"FAIL: Expected 403, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_rbac_forbidden()
