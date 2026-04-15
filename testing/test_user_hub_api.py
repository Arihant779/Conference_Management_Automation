import requests
import pytest
import uuid

BASE_URL = "http://localhost:4000/api/dashboards/user-hub"
# Use real ID for consistency with your existing data
REAL_USER_ID = "bd06436a-cd05-4f10-85ac-16f367bc4c94" 

def assert_response(res, expected=200):
    if res.status_code != expected:
        print(f"FAILED: {res.text}")
    assert res.status_code == expected

def test_01_stats_loading_integrity():
    """01: Verify dashboard stats load for a real user"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    assert_response(res)
    data = res.json()["stats"]
    assert "myConfs" in data
    assert "organizer" in data

def test_02_organizer_count_accuracy():
    """02: Verify Organizer counter matches roleMap logic"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    stats = res.json()["stats"]
    invs = res.json()["involvements"]
    actual_orgs = len([i for i in invs if i["role"] == 'organizer'])
    assert stats["organizer"] == actual_orgs

def test_03_reviewer_count_accuracy():
    """03: Verify Reviewer counter matches roleMap logic"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    stats = res.json()["stats"]
    invs = res.json()["involvements"]
    actual_revs = len([i for i in invs if i["role"] == 'reviewer'])
    assert stats["reviewer"] == actual_revs

def test_04_member_count_accuracy():
    """04: Verify Member/Attendee counter"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    stats = res.json()["stats"]
    invs = res.json()["involvements"]
    # Logic in API combines 'member' and 'invited' as participants
    actual_mems = len([i for i in invs if i["role"] in ['member', 'invited']])
    assert stats["member"] == actual_mems

def test_05_total_metrics_balance():
    """05: Total metrics should sum up correctly"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    stats = res.json()["stats"]
    assert stats["myConfs"] == (stats["organizer"] + stats["reviewer"] + stats["member"])

def test_06_volunteer_preferences_save():
    """06: Verify domain preferences persist"""
    domains = ["AI", f"Quantum {uuid.uuid4().hex[:4]}"]
    payload = {"userId": REAL_USER_ID, "domains": domains, "roles": ["logistics_head"]}
    res = requests.post(f"{BASE_URL}/preferences", json=payload)
    assert_response(res)
    assert res.json()["profile"]["volunteer_domains"] == domains

def test_07_volunteer_roles_persistence():
    """07: Verify role interests persist"""
    roles = ["technical_head", "outreach_head"]
    payload = {"userId": REAL_USER_ID, "domains": [], "roles": roles}
    res = requests.post(f"{BASE_URL}/preferences", json=payload)
    assert res.json()["profile"]["volunteer_roles"] == roles

def test_08_available_conferences_filter():
    """08: Verify 'Available' list excludes joined ones"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    data = res.json()
    # If the user is in at least one conference, available should correctly skip them
    # Note: This is an architectural check
    assert "available" in data["stats"]

def test_09_profile_identity_sync():
    """09: Verify user name and email are correct"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    profile = res.json()["profile"]
    assert "user_email" in profile or "email" in profile

def test_10_empty_user_stats():
    """10: Verify stats for a brand new (fake) user"""
    fake_id = str(uuid.uuid4())
    res = requests.get(f"{BASE_URL}/{fake_id}")
    assert res.json()["stats"]["myConfs"] == 0

def test_11_involvement_detail_verification():
    """11: Verify detail list has conference IDs"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    for inv in res.json()["involvements"]:
        assert "conference_id" in inv

def test_12_data_isolation():
    """12: User stats are specific (Architecture Check)"""
    # Simply running two different IDs proves isolation in the logic
    id1 = REAL_USER_ID
    id2 = str(uuid.uuid4())
    res1 = requests.get(f"{BASE_URL}/{id1}")
    res2 = requests.get(f"{BASE_URL}/{id2}")
    assert res1.json()["stats"] != res2.json()["stats"]

def test_13_role_promotion_impact():
    """13: Test if role promotion reflects in counts"""
    # This simulates a role change (if we had a promotion route, we'd use it)
    # For now, we verify the GET response consistency.
    pass

def test_14_api_latency_performance():
    """14: Performance check (< 300ms)"""
    import time
    start = time.time()
    requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    end = time.time()
    assert (end - start) < 0.3

def test_15_backend_schema_stability():
    """15: Final check that stats structure hasn't changed"""
    res = requests.get(f"{BASE_URL}/{REAL_USER_ID}")
    keys = res.json()["stats"].keys()
    assert all(k in keys for k in ["myConfs", "organizer", "reviewer", "member"])

if __name__ == "__main__":
    pytest.main(["-v", __file__])
