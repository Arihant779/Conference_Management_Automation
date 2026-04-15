import requests
import pytest
import uuid

BASE_URL = "http://localhost:4000/api/auth"

class State:
    test_email = f"test-{uuid.uuid4().hex[:6]}@example.com"
    test_pwd = "ComplexPassword123!"

state = State()

def assert_response(res, expected=200):
    if res.status_code != expected:
        print(f"FAILED (Status {res.status_code}): {res.text}")
    assert res.status_code == expected

def test_01_wrong_password_login():
    """01: Verify login failure with bad credentials"""
    res = requests.post(f"{BASE_URL}/login", json={
        "email": state.test_email, "password": "WrongPassword"
    })
    assert res.status_code == 401
    assert "invalid" in res.text.lower()

def test_02_non_existent_user_login():
    """02: Verify login failure for unregistered accounts"""
    res = requests.post(f"{BASE_URL}/login", json={
        "email": "not-a-user@void.com", "password": "SomePassword"
    })
    assert res.status_code == 401

def test_03_empty_email_rejection():
    """03: Edge Case - Rejection of empty email field"""
    res = requests.post(f"{BASE_URL}/register", json={"email": "", "password": "P", "name": "N"})
    assert res.status_code != 200

def test_04_malformed_email_rejection():
    """04: Edge Case - Rejection of invalid email format"""
    res = requests.post(f"{BASE_URL}/register", json={"email": "not-an-email", "password": "P", "name": "N"})
    assert res.status_code != 200

def test_05_missing_name_rejection():
    """05: Edge Case - Rejection of registration without a name"""
    email = f"missing-name-{uuid.uuid4().hex[:6]}@test.com"
    res = requests.post(f"{BASE_URL}/register", json={"email": email, "password": "P", "name": ""})
    assert res.status_code != 200

if __name__ == "__main__":
    pytest.main(["-v", __file__])
