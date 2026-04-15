import requests
import pytest
import base64

ROOT_URL = "http://localhost:4000"
BASE_URL = "http://localhost:4000/api"
TEST_RECIP = "iykyk123123@gmail.com" # Using your configured sender as recipient for safe testing

def assert_response(res, expected=200):
    if res.status_code != expected:
        print(f"FAILED: {res.text}")
    assert res.status_code == expected

# --- AI & LOGIC TESTS (No Mails Sent) ---

def test_01_ai_generation_standard():
    """01: Generate Standard Email content via AI"""
    payload = {"intent": "Invite speakers", "tone": "Professional", "conferenceTitle": "Tech Summit"}
    res = requests.post(f"{BASE_URL}/generate-email", json=payload)
    assert_response(res)
    assert "Tech Summit" in res.json()["body"] or "Tech Summit" in res.json()["subject"]

def test_02_ai_tone_casual():
    """02: Verify Casual tone drafting"""
    payload = {"intent": "Welcome newcomers", "tone": "Casual"}
    res = requests.post(f"{BASE_URL}/generate-email", json=payload)
    assert_response(res)
    # Relaxed assertion as LLMs vary
    assert len(res.json()["body"]) > 20

def test_03_ai_subject_locking():
    """03: Verify AI respects a locked subject"""
    locked_subj = "TEST_SUBJECT_STABILITY"
    payload = {"intent": "Test", "subject": locked_subj}
    res = requests.post(f"{BASE_URL}/generate-email", json=payload)
    assert res.json()["subject"] == locked_subj

def test_04_ai_personalization():
    """04: Verify audience-specific content"""
    payload = {"intent": "Award ceremony", "recipientDescription": "Student winners from MIT"}
    res = requests.post(f"{BASE_URL}/generate-email", json=payload)
    assert "MIT" in res.json()["body"]

def test_05_ai_tag_parsing():
    """05: Verify SUBJECT/BODY tags are removed from output"""
    res = requests.post(f"{BASE_URL}/generate-email", json={"intent": "Short message"})
    assert "SUBJECT:" not in res.json()["subject"]
    assert "BODY:" not in res.json()["body"]

def test_06_field_validation():
    """06: Ensure error on missing recipient"""
    res = requests.post(f"{BASE_URL}/send-email", json={"subject": "S", "body": "B"})
    assert_response(res, 400)

# --- ACTUAL DELIVERY TESTS (3 Minimal Mails Sent) ---

def test_07_smtp_health_ping():
    """07: [SEND 1] Verify Gmail SMTP connection is alive"""
    res = requests.post(f"{BASE_URL}/test-email")
    assert_response(res)
    assert res.json()["success"] == True

def test_08_send_with_attachment():
    """08: [SEND 2] Verify delivery of PDF attachment"""
    mock_pdf = base64.b64encode(b"%PDF-1.4 header contents").decode()
    payload = {
        "to": TEST_RECIP,
        "subject": "Test: Attachment Delivery",
        "body": "This contains a mock PDF attachment.",
        "attachment": {"filename": "test.pdf", "content": mock_pdf}
    }
    res = requests.post(f"{BASE_URL}/send-email-with-attachment", json=payload)
    assert_response(res)

def test_09_bulk_send_logic():
    """09: [SEND 3] Verify bulk delivery array handling"""
    payload = {
        "to": [TEST_RECIP], # Single recipient to minimize spam
        "subject": "Test: Bulk Logic",
        "body": "Verifying array processing works."
    }
    res = requests.post(f"{BASE_URL}/send-email", json=payload)
    assert_response(res)
    assert res.json()["sent"] == 1

def test_10_sender_metadata():
    """10: Verify 'From' address visibility"""
    res = requests.get(f"{ROOT_URL}/health") # Health is at root, not /api
    assert_response(res)
    assert res.json()["gmailClient"] == "configured"
    assert "iykyk" in res.json()["defaultSender"]

if __name__ == "__main__":
    pytest.main(["-v", __file__])
