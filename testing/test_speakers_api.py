import requests
import pytest
import uuid

BASE_URL = "http://localhost:4000/api/speakers"
CONF_ID = "63059494-0233-4dc7-9dae-2033519345e8"
TEST_RECIP = "iykyk123123@gmail.com"

class State:
    invite_id = None
    speaker_name = f"Speaker {uuid.uuid4().hex[:4]}"

state = State()

def assert_response(res, expected=200):
    if res.status_code != expected:
        print(f"FAILED: {res.text}")
    assert res.status_code == expected

# --- DISCOVERY TESTS (Actual Web Search) ---

def test_01_speaker_search_by_topic():
    """01: Search Researchers for 'Robotics'"""
    # Source 5 = Google Search via paper repositories
    res = requests.get(f"{BASE_URL}?topic=Robotics&limit=2&source=5")
    assert_response(res)
    assert len(res.json()) > 0

def test_02_linkedin_expert_search():
    """02: Search Experts via LinkedIn source"""
    # Source 3 = LinkedIn specific search
    res = requests.get(f"{BASE_URL}?topic=Computer+Vision&source=3")
    assert_response(res)
    assert len(res.json()) > 0

def test_03_email_discovery_logic():
    """03: Finding Professor email by name/org"""
    res = requests.get(f"{BASE_URL}/email?name=Yann+LeCun&org=NYU")
    assert_response(res)
    assert "email" in res.json()

# --- AI & PROFILING TESTS ---

def test_04_ai_profile_generation():
    """04: AI Synthesis of academic bio"""
    res = requests.post(f"{BASE_URL}/generate-profile", json={"name": "Geoffrey Hinton"})
    assert_response(res)
    assert "INSTITUTION" in res.text or "institution" in res.json()
    assert len(res.json()["profile"]) > 20

def test_05_invitation_personalization():
    """05: AI Invitation Drafting"""
    payload = {
        "name": "Test Speaker",
        "institution": "Stanford",
        "profile": "Expert in Large Language Models",
        "conferenceTitle": "AI Innovation 2025"
    }
    res = requests.post(f"{BASE_URL}/personalize", json=payload)
    assert_response(res)
    assert "LLM" in res.json()["body"] or "Large Language" in res.json()["body"]

# --- OUTREACH & PERSISTENCE ---

def test_06_send_and_persist_invitation():
    """06: [SEND 1] Send Live Invite + Save to DB"""
    payload = {
        "conference_id": CONF_ID,
        "speaker_name": state.speaker_name,
        "speaker_email": TEST_RECIP,
        "subject": "Integration Test: Invitation",
        "body": "We would love to have you speak."
    }
    res = requests.post(f"{BASE_URL}/invite", json=payload)
    assert_response(res)
    state.invite_id = res.json()["invite"]["id"]

def test_07_invitation_list_verification():
    """07: Verify invite appears in conference list"""
    res = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    assert_response(res)
    assert any(i["id"] == state.invite_id for i in res.json())

def test_08_follow_up_nudge_logic():
    """08: [SEND 2] Build and send AI nudge"""
    res = requests.post(f"{BASE_URL}/follow-up", json={"invite_id": state.invite_id})
    assert_response(res)
    assert res.json()["invite"]["follow_up_count"] >= 1

def test_09_bulk_follow_up_logic():
    """09: [SEND 3] Execute bulk nudge for conference"""
    # Note: This will nudge our pending 'state.speaker_name'
    res = requests.post(f"{BASE_URL}/bulk-follow-up", json={"conference_id": CONF_ID})
    assert_response(res)
    assert res.json()["count"] > 0

# --- RESPONSE FLOW (Magic Links) ---

def test_10_magic_link_accept():
    """10: Simulate clicking 'Accept' in email"""
    # Endpoint: GET /respond?id=...&status=accepted
    res = requests.get(f"{BASE_URL}/respond?id={state.invite_id}&status=accepted", allow_redirects=False)
    # Check redirect or status update
    assert res.status_code in [200, 302]
    
    # Verify DB state
    check = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    invite = next(i for i in check.json() if i["id"] == state.invite_id)
    assert invite["status"] == "accepted"

def test_11_magic_link_decline():
    """11: Simulate clicking 'Decline' in email"""
    res = requests.get(f"{BASE_URL}/respond?id={state.invite_id}&status=declined", allow_redirects=False)
    assert res.status_code in [200, 302]
    
    # Verify DB state
    check = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    invite = next(i for i in check.json() if i["id"] == state.invite_id)
    assert invite["status"] == "declined"

# --- ADVANCED CASES ---

def test_12_scheduled_outreach_logic():
    """12: Schedule invitation for future (No immediate send)"""
    payload = {
        "conference_id": CONF_ID,
        "speaker_name": "Future Speaker",
        "speaker_email": "future@test.com",
        "subject": "Future Talk",
        "body": "Wait for it...",
        "scheduledAt": "2025-12-31T23:59:59Z"
    }
    res = requests.post(f"{BASE_URL}/invite", json=payload)
    assert res.json()["invite"]["status"] == "scheduled"

def test_13_missing_email_error():
    """13: Error on missing recipient email"""
    res = requests.post(f"{BASE_URL}/invite", json={"speaker_name": "X", "subject": "S", "body": "B"})
    assert_response(res, 400)

def test_14_search_limit_enforcement():
    """14: Verify limit=1 works for search"""
    res = requests.get(f"{BASE_URL}?topic=AI&limit=1&source=5")
    assert len(res.json()) == 1

def test_15_clean_up_logic():
    """15: Final check of outreach history"""
    res = requests.get(f"{BASE_URL}/invitations?conference_id={CONF_ID}")
    assert len(res.json()) > 0

if __name__ == "__main__":
    pytest.main(["-v", __file__])
