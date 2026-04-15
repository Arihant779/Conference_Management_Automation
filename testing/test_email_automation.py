import requests
import pytest
import time
import uuid
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:4000/api/speakers"
CONF_ID = "c7d7e8b9-a0a1-4b2c-8d3e-4f5a6b7c8d9e" 

class State:
    invite_id = None
    speaker_email = f"auto-test-{uuid.uuid4().hex[:6]}@example.com"

state = State()

def assert_response(res, expected=200):
    if res.status_code != expected:
        print(f"FAILED (Status {res.status_code}): {res.text}")
    assert res.status_code == expected

def test_01_immediate_invite():
    """01: Send immediate invitation and verify status is 'pending'"""
    payload = {
        "conference_id": CONF_ID,
        "speaker_name": "Automation Tester",
        "speaker_email": state.speaker_email,
        "subject": "Immediate Invite Test",
        "body": "This is an immediate invite test."
    }
    res = requests.post(f"{BASE_URL}/invite", json=payload)
    assert_response(res)
    state.invite_id = res.json()["invite"]["id"]
    assert res.json()["invite"]["status"] == "pending"

def test_02_scheduled_invite():
    """02: Schedule invitation for +2 minutes (UTC) and verify status is 'scheduled'"""
    run_time = (datetime.now(timezone.utc) + timedelta(minutes=2)).isoformat()
    payload = {
        "conference_id": CONF_ID,
        "speaker_name": "Scheduled Tester",
        "speaker_email": f"scheduled-{uuid.uuid4().hex[:4]}@test.com",
        "subject": "Scheduled Invite Test",
        "body": "This is a scheduled invite test.",
        "scheduledAt": run_time
    }
    res = requests.post(f"{BASE_URL}/invite", json=payload)
    assert_response(res)
    assert res.json()["invite"]["status"] == "scheduled"

def test_03_imminent_schedule_dispatch_sync():
    """03: Verify scheduler logic for UTC synchronization"""
    run_time = (datetime.now(timezone.utc) + timedelta(seconds=5)).isoformat()
    payload = {
        "conference_id": CONF_ID,
        "speaker_name": "Sync Tester",
        "speaker_email": f"sync-{uuid.uuid4().hex[:4]}@test.com",
        "subject": "Sync Test",
        "body": "Checking UTC sync.",
        "scheduledAt": run_time
    }
    res = requests.post(f"{BASE_URL}/invite", json=payload)
    assert_response(res)
    assert res.json()["invite"]["status"] == "scheduled"

def test_04_magic_link_accept():
    """04: Verify magic link Accept updates DB to 'accepted'"""
    res = requests.get(f"{BASE_URL}/respond?id={state.invite_id}&status=accepted", allow_redirects=False)
    assert res.status_code in [200, 302]
    check_res = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    my_invite = next((i for i in check_res.json() if i["id"] == state.invite_id), None)
    assert my_invite["status"] == "accepted"

def test_05_magic_link_decline():
    """05: Verify magic link Decline updates DB to 'declined'"""
    payload = {
        "conference_id": CONF_ID, "speaker_name": "Decliner", "speaker_email": "decline@test.com",
        "subject": "Decline Test", "body": "Test decline link."
    }
    res = requests.post(f"{BASE_URL}/invite", json=payload)
    dec_id = res.json()["invite"]["id"]
    requests.get(f"{BASE_URL}/respond?id={dec_id}&status=declined", allow_redirects=False)
    check_res = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    my_invite = next((i for i in check_res.json() if i["id"] == dec_id), None)
    assert my_invite["status"] == "declined"

def test_06_immediate_nudge():
    """06: Trigger immediate follow-up nudge"""
    res = requests.post(f"{BASE_URL}/follow-up", json={"invite_id": state.invite_id})
    assert_response(res)
    assert res.json()["invite"]["follow_up_count"] >= 1

def test_07_scheduled_nudge():
    """07: Schedule a nudge for +1 hour (UTC)"""
    nudge_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    res = requests.post(f"{BASE_URL}/follow-up", json={"invite_id": state.invite_id, "scheduledAt": nudge_time})
    assert_response(res)
    assert res.json()["invite"]["status"] == "scheduled"

def test_08_bulk_follow_up():
    """08: Run bulk follow-up for all pending invites"""
    res = requests.post(f"{BASE_URL}/bulk-follow-up", json={"conference_id": CONF_ID})
    assert_response(res)
    assert "count" in res.json()

def test_09_nudge_subject_persistence():
    """09: Verify DB stores most recent nudge subject/body"""
    res = requests.post(f"{BASE_URL}/follow-up", json={"invite_id": state.invite_id})
    assert_response(res)
    new_subject = res.json()["invite"]["invitation_subject"]
    check_res = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    my_invite = next((i for i in check_res.json() if i["id"] == state.invite_id), None)
    assert my_invite["invitation_subject"] == new_subject

def test_10_invalid_invite_respond():
    """10: Safe handling of invalid response links"""
    res = requests.get(f"{BASE_URL}/respond?id=00000000-0000-0000-0000-000000000000&status=accepted")
    assert res.status_code == 500

def test_11_empty_metadata_nudge():
    """11: Personalize nudge for minimal speaker profile"""
    payload = {"conference_id": CONF_ID, "speaker_name": "Mystery", "speaker_email": "m@test.com", "subject": "S", "body": "B"}
    res = requests.post(f"{BASE_URL}/invite", json=payload)
    nudge_res = requests.post(f"{BASE_URL}/follow-up", json={"invite_id": res.json()["invite"]["id"]})
    assert_response(nudge_res)

def test_12_frontlink_redirect_check():
    """12: Verify redirect URL contains response status"""
    res = requests.get(f"{BASE_URL}/respond?id={state.invite_id}&status=accepted", allow_redirects=False)
    assert "status=accepted" in res.headers["Location"]

def test_13_future_exclusion():
    """13: Verify far-future items are correctly labeled as 'scheduled'"""
    far_time = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    payload = {
        "conference_id": CONF_ID, "speaker_name": "Future", "speaker_email": "f@test.com",
        "subject": "Far", "body": "Wait", "scheduledAt": far_time
    }
    requests.post(f"{BASE_URL}/invite", json=payload)
    check_res = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    future_invite = next((i for i in check_res.json() if i["speaker_email"] == "f@test.com"), None)
    assert future_invite["status"] == "scheduled"

if __name__ == "__main__":
    pytest.main(["-v", __file__])
