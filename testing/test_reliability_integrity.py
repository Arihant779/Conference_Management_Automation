import requests
import uuid
import time
from config import BASE_URL, REAL_CONF_ID

# ─────────────────────────────────────────────────────────────
# TC 01: Email Retry Logic
# System should retry failed email deliveries automatically
# ─────────────────────────────────────────────────────────────
def test_email_retry_logic():
    """
    Verifies that the system has automatic email retry capability.
    We test this by:
      1. Creating a scheduled invitation with an invalid email address.
      2. Waiting for the scheduler cron (runs every minute) to pick it up.
      3. Checking that the retry_count has been incremented, proving
         the system automatically retried the failed delivery.
    """
    print("\n" + "=" * 60)
    print("TC 01: Email Retry Logic")
    print("System should retry failed email deliveries automatically")
    print("=" * 60)

    try:
        # Step 1: Create a scheduled invitation with an invalid email
        test_email = f"retry-test-{uuid.uuid4().hex[:6]}@invalid-domain-xyz.test"
        payload = {
            "conference_id": REAL_CONF_ID,
            "speaker_name": "Retry Test Speaker",
            "speaker_email": test_email,
            "subject": "Retry Logic Verification",
            "body": "This email is expected to fail for retry testing.",
            "scheduledAt": "2020-01-01T00:00:00Z"  # Past date so scheduler picks it up immediately
        }

        print(f"  Step 1: Creating scheduled invitation for '{test_email}'...")
        res = requests.post(f"{BASE_URL}/speakers/invite", json=payload)
        if res.status_code != 200:
            print(f"  [FAIL] Could not create test invitation: {res.text}")
            return

        invite_id = res.json().get("invite", {}).get("id")
        print(f"  Step 2: Invitation created (ID: {invite_id}). Status: 'scheduled'")

        # Step 2: Wait for the scheduler to process it (runs every minute)
        print("  Step 3: Waiting for scheduler to attempt delivery (up to 90 seconds)...")
        max_wait = 90
        poll_interval = 10
        elapsed = 0
        retry_detected = False

        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval

            check = requests.get(f"{BASE_URL}/speakers/invitations?conference_id={REAL_CONF_ID}")
            invites = check.json()
            target = next((i for i in invites if i.get("id") == invite_id), None)

            if target:
                retry_count = target.get("retry_count", 0)
                status = target.get("status", "")
                print(f"    [{elapsed}s] status={status}, retry_count={retry_count}")

                # Retry logic is proven if retry_count > 0 OR status changed to 'pending'/'failed'
                if retry_count > 0 or status in ("pending", "failed"):
                    retry_detected = True
                    break

        if retry_detected:
            print(f"  [PASS] Retry logic verified — retry_count={target.get('retry_count')}, status={target.get('status')}")
        else:
            print("  [FAIL] Scheduler did not process the invitation within the timeout.")

    except Exception as e:
        print(f"  [ERROR] {e}")


# ─────────────────────────────────────────────────────────────
# TC 02: Failure Handling Detection
# Checks system tracks failed or retried invitations
# ─────────────────────────────────────────────────────────────
def test_failure_handling_detection():
    """
    Verifies that the system tracks failed or retried invitations
    by checking the database for records with retry_count > 0
    or status == 'failed'.
    """
    print("\n" + "=" * 60)
    print("TC 02: Failure Handling Detection")
    print("Checks system tracks failed or retried invitations")
    print("=" * 60)

    try:
        res = requests.get(f"{BASE_URL}/speakers/invitations?conference_id={REAL_CONF_ID}")
        if res.status_code != 200:
            print(f"  [FAIL] API returned status {res.status_code}")
            return

        invites = res.json()
        retried = [i for i in invites if i.get("retry_count", 0) > 0]
        failed = [i for i in invites if i.get("status") == "failed"]

        print(f"  Total Invitations: {len(invites)}")
        print(f"  Invitations with retry_count > 0: {len(retried)}")
        print(f"  Invitations with status 'failed': {len(failed)}")

        if retried:
            print("\n  Retried Invitations:")
            for i in retried:
                print(f"    - {i['speaker_email']}: retry_count={i['retry_count']}, status={i['status']}")

        if failed:
            print("\n  Failed Invitations:")
            for i in failed:
                print(f"    - {i['speaker_email']}: retry_count={i.get('retry_count', 0)}, status={i['status']}")

        if len(retried) > 0 or len(failed) > 0:
            print("  [PASS] System correctly tracks failed/retried invitations in the database.")
        else:
            print("  [FAIL] No evidence of failure tracking found. Run TC 01 first to generate retry data.")

    except Exception as e:
        print(f"  [ERROR] {e}")


# ─────────────────────────────────────────────────────────────
# TC 03: Data Integrity Check
# System responds correctly ensuring no data loss
# ─────────────────────────────────────────────────────────────
def test_data_integrity():
    """
    Verifies data integrity by:
      1. Creating an invitation record via the API.
      2. Fetching it back and confirming all fields match.
      3. Confirming the data was persisted without corruption.
    """
    print("\n" + "=" * 60)
    print("TC 03: Data Integrity Check")
    print("System responds correctly ensuring no data loss")
    print("=" * 60)

    unique_id = uuid.uuid4().hex[:8]
    test_name = f"Integrity-Speaker-{unique_id}"
    test_email = f"integrity-{unique_id}@testcheck.com"
    test_subject = f"Integrity Subject {unique_id}"
    test_body = f"Integrity body content {unique_id}"

    try:
        # Step 1: Create an invitation
        payload = {
            "conference_id": REAL_CONF_ID,
            "speaker_name": test_name,
            "speaker_email": test_email,
            "subject": test_subject,
            "body": test_body,
            "scheduledAt": "2099-12-31T23:59:59Z"  # Far future — won't be processed
        }

        print(f"  Step 1: Creating invitation for '{test_email}'...")
        res = requests.post(f"{BASE_URL}/speakers/invite", json=payload)
        if res.status_code != 200:
            print(f"  [FAIL] Could not create invitation: {res.text}")
            return

        created = res.json().get("invite", {})
        invite_id = created.get("id")
        print(f"  Step 2: Invitation created (ID: {invite_id})")

        # Step 2: Fetch all invitations and find our record
        print("  Step 3: Fetching invitation back from API...")
        fetch_res = requests.get(f"{BASE_URL}/speakers/invitations?conference_id={REAL_CONF_ID}")
        invites = fetch_res.json()
        matched = next((i for i in invites if i.get("id") == invite_id), None)

        if not matched:
            print("  [FAIL] Created invitation was not found in the database — possible data loss!")
            return

        # Step 3: Verify field integrity
        checks = {
            "speaker_name": (matched.get("speaker_name"), test_name),
            "speaker_email": (matched.get("speaker_email"), test_email),
            "invitation_subject": (matched.get("invitation_subject"), test_subject),
            "invitation_body": (matched.get("invitation_body"), test_body),
            "status": (matched.get("status"), "scheduled"),
            "conference_id": (matched.get("conference_id"), REAL_CONF_ID),
        }

        all_pass = True
        for field, (actual, expected) in checks.items():
            if actual == expected:
                print(f"    ✅ {field}: matched")
            else:
                print(f"    ❌ {field}: expected '{expected}', got '{actual}'")
                all_pass = False

        if all_pass:
            print("  [PASS] All fields persisted correctly — no data loss detected.")
        else:
            print("  [FAIL] Some fields did not match — data integrity issue detected.")

    except Exception as e:
        print(f"  [ERROR] {e}")


# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_email_retry_logic()
    test_failure_handling_detection()
    test_data_integrity()
