import pytest
import requests
import uuid

# Backend configuration
BASE_URL = "http://localhost:4000/api/teams"

# Real IDs provided by user
REAL_CONF_ID = "63059494-0233-4dc7-9dae-2033519345e8"
REAL_USER_1 = "bd06436a-cd05-4f10-85ac-16f367bc4c94"
REAL_USER_2 = "3a1e36b6-63a3-4c16-988f-a30229b8428a"

class TestState:
    team_id = None
    math_team_id = None

state = TestState()

# --- PHASE 1: CORE OPERATIONS & VALIDATION ---

def test_01_mandatory_validation():
    """01: Mandatory Validation"""
    data = {"conference_id": REAL_CONF_ID, "name": " "}
    res = requests.post(f"{BASE_URL}/create", json=data)
    assert res.status_code == 400
    assert res.json()["error"] == "ERROR_MISSING_NAME"

def test_02_member_deduplication():
    """02: Member Deduplication"""
    team_name = f"Dedupe-{uuid.uuid4().hex[:6]}"
    data = {
        "conference_id": REAL_CONF_ID,
        "name": team_name,
        "members": [REAL_USER_1, REAL_USER_1, REAL_USER_1]
    }
    res = requests.post(f"{BASE_URL}/create", json=data)
    assert res.status_code == 200
    team_id = res.json()["team"]["id"]
    status_res = requests.get(f"{BASE_URL}/{team_id}/status")
    assert status_res.json()["stats"]["total"] == 1

def test_03_auto_registration():
    """03: Auto-Registration"""
    team_name = f"AutoReg-{uuid.uuid4().hex[:6]}"
    data = {
        "conference_id": REAL_CONF_ID,
        "name": team_name,
        "members": [REAL_USER_1]
    }
    res = requests.post(f"{BASE_URL}/create", json=data)
    assert res.status_code == 200
    state.team_id = res.json()["team"]["id"]

def test_04_handshake_flow():
    """04: Handshake Flow (Accept/Reject)"""
    team_id = state.team_id
    res_acc = requests.post(f"{BASE_URL}/invite/respond", json={
        "team_id": team_id, "user_id": REAL_USER_1, "status": "accepted"
    })
    assert res_acc.status_code == 200
    status_res = requests.get(f"{BASE_URL}/{team_id}/status")
    assert status_res.json()["stats"]["accepted"] == 1

def test_05_config_update():
    """05: Config Update"""
    new_desc = "Updated by API test"
    new_color = "#ff00ff"
    res = requests.put(f"{BASE_URL}/{state.team_id}", json={
        "description": new_desc,
        "color": new_color
    })
    assert res.status_code == 200
    assert res.json()["team"]["description"] == new_desc
    assert res.json()["team"]["color"] == new_color

def test_06_offboarding_logic():
    """06: Offboarding Logic"""
    res = requests.post(f"{BASE_URL}/{state.team_id}/sync", json={
        "removes": [REAL_USER_1]
    })
    assert res.status_code == 200
    status_res = requests.get(f"{BASE_URL}/{state.team_id}/status")
    assert status_res.json()["stats"]["total"] == 0

def test_07_type_categorization():
    """07: Type Categorization"""
    data = {"conference_id": REAL_CONF_ID, "name": f"Tech Review Group 07 {uuid.uuid4().hex[:6]}", "type": "technical"}
    res = requests.post(f"{BASE_URL}/create", json=data)
    assert res.status_code == 200
    assert "Technical" in res.json()["team"]["name"]

def test_08_formation_math():
    """08: Formation Math"""
    team_name = f"Math-{uuid.uuid4().hex[:6]}"
    res = requests.post(f"{BASE_URL}/create", json={
        "conference_id": REAL_CONF_ID,
        "name": team_name,
        "members": [REAL_USER_1, REAL_USER_2]
    })
    tid = res.json()["team"]["id"]
    state.math_team_id = tid
    requests.post(f"{BASE_URL}/invite/respond", json={"team_id": tid, "user_id": REAL_USER_1, "status": "accepted"})
    status = requests.get(f"{BASE_URL}/{tid}/status").json()["stats"]
    assert status["formationProgress"] == 50.0

def test_09_cascade_cleanup():
    """09: Cascade Cleanup"""
    cleanup_tid = state.math_team_id
    requests.delete(f"{BASE_URL}/{cleanup_tid}")
    res = requests.get(f"{BASE_URL}/{cleanup_tid}/status")
    assert res.status_code == 200
    assert res.json()["stats"]["total"] == 0

def test_10_name_collision():
    """10: Name Collision"""
    name = f"Collision-{uuid.uuid4().hex[:6]}"
    requests.post(f"{BASE_URL}/create", json={"conference_id": REAL_CONF_ID, "name": name})
    res = requests.post(f"{BASE_URL}/create", json={"conference_id": REAL_CONF_ID, "name": name})
    assert res.status_code == 400
    assert res.json()["error"] == "ERROR_TEAM_NAME_EXISTS"

def test_11_empty_state_logic():
    """11: Empty State Logic"""
    res = requests.post(f"{BASE_URL}/create", json={"conference_id": REAL_CONF_ID, "name": f"Empty-{uuid.uuid4().hex[:4]}"})
    tid = res.json()["team"]["id"]
    status = requests.get(f"{BASE_URL}/{tid}/status").json()["stats"]
    assert status["total"] == 0
    assert status["formationProgress"] == 0

def test_12_custom_hex_colors():
    """12: Custom Hex Colors"""
    color = "#aabbcc"
    res = requests.post(f"{BASE_URL}/create", json={"conference_id": REAL_CONF_ID, "name": f"Color-{uuid.uuid4().hex[:4]}", "color": color})
    assert res.json()["team"]["color"] == color

def test_13_role_stability():
    """13: Role Stability"""
    res = requests.get(f"{BASE_URL}/{state.team_id}/status")
    assert "total" in res.json()["stats"]

def test_14_desc_sanitization():
    """14: Desc. Sanitization"""
    desc = "Special: ' \" & @ < >"
    res = requests.put(f"{BASE_URL}/{state.team_id}", json={"description": desc})
    assert res.json()["team"]["description"] == desc

def test_15_fully_formed_badge():
    """15: Fully Formed Badge"""
    res = requests.post(f"{BASE_URL}/create", json={"conference_id": REAL_CONF_ID, "name": f"Final-{uuid.uuid4().hex[:4]}", "members": [REAL_USER_1]})
    tid = res.json()["team"]["id"]
    requests.post(f"{BASE_URL}/invite/respond", json={"team_id": tid, "user_id": REAL_USER_1, "status": "accepted"})
    status = requests.get(f"{BASE_URL}/{tid}/status").json()["stats"]
    assert status["isFullyFormed"] == True
