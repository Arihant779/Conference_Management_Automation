import requests
import uuid
import sys
from config import BASE_URL, ADMIN_EMAIL, ADMIN_PWD, REAL_CONF_ID

def get_auth_token():
    """Helper to login and get session token. Registers if 401."""
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PWD
    }
    
    # 1. Try Login
    res = requests.post(f"{BASE_URL}/auth/login", json=payload)
    if res.status_code == 200:
        return res.json().get("session", {}).get("access_token")
    
    # 2. If 401, try Registering once
    if res.status_code == 401:
        print("[INFO] Test user not found. Attempting auto-registration...")
        reg_payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PWD,
            "name": "Security Tester"
        }
        reg_res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
        if reg_res.status_code == 200:
            print("[SUCCESS] Test user registered. Proceeding to login...")
            res = requests.post(f"{BASE_URL}/auth/login", json=payload)
            if res.status_code == 200:
                return res.json().get("session", {}).get("access_token")
        else:
            print(f"[ERROR] Registration failed: {reg_res.status_code} - {reg_res.text}")
    
    return None

def test_invalid_login_blocked():
    """TC 01: Invalid Login Blocking"""
    print("\n--- TC 01: Testing Invalid Login Blocking ---")
    payload = {"email": "fake@user.com", "password": "wrongpassword"}
    res = requests.post(f"{BASE_URL}/auth/login", json=payload)
    if res.status_code == 401:
        print("[PASS] Unauthorized login correctly blocked.")
    else:
        print(f"[FAIL] Expected 401, got {res.status_code}")

def test_secure_login_validation():
    """TC 02: Secure Login Validation"""
    print("\n--- TC 02: Testing Secure Login Validation ---")
    token = get_auth_token()
    if token:
        print("[PASS] Valid login returned user object and session token.")
        return token
    else:
        print("[FAIL] Could not authenticate test user.")
        return None

def test_role_based_access_control(token):
    """TC 03: Role-Based Access Control (RBAC)"""
    print("\n--- TC 03: Testing Role-Based Access Control (RBAC) ---")
    
    endpoint = f"{BASE_URL}/speakers/invitations?conference_id={REAL_CONF_ID}"
    
    # 1. Test without token (Should be blocked)
    print("Step 1: Accessing endpoint WITHOUT token...")
    res_no_token = requests.get(endpoint)
    if res_no_token.status_code == 401:
        print("[PASS] Endpoint blocked correctly without authentication.")
    else:
        print(f"[FAIL] Expected 401 for unauthorized access, but got {res_no_token.status_code}")

    # 2. Test with token (Should be allowed)
    if not token:
        print("[SKIP] Cannot test authorized access without a valid token.")
        return

    print("Step 2: Accessing endpoint WITH valid token...")
    headers = {"Authorization": f"Bearer {token}"}
    res_with_token = requests.get(endpoint, headers=headers)
    if res_with_token.status_code == 200:
        print("[PASS] Endpoint successfully accessed with valid token.")
    else:
        print(f"[FAIL] Expected 200 for authorized access, but got {res_with_token.status_code}")
        print(f"Error: {res_with_token.text}")

if __name__ == "__main__":
    test_invalid_login_blocked()
    token = test_secure_login_validation()
    test_role_based_access_control(token)
