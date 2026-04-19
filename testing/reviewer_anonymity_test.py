import requests

def test_reviewer_anonymity():
    print("TC 08: Reviewer Anonymity")
    print("Verifying that reviewer identities are hidden in review reports...")
    
    URL = "http://localhost:5000/api/papers/123/reviews"
    
    try:
        response = requests.get(URL)
        if response.status_code == 200:
            data = response.json()
            reviews = data.get('reviews', [])
            
            print(f"Server Response: {data}")
            
            # forbidden_keys are identifiers that should NOT be present in an anonymous report
            forbidden_keys = ['reviewer_name', 'reviewer_email', 'full_name', 'email', 'user_id']
            passed = True
            
            for review in reviews:
                # 1. Check if any forbidden identifying keys are present
                for key in forbidden_keys:
                    if key in review:
                        print(f"FAIL: Sensitive key '{key}' found in review: {review}")
                        passed = False
                
                # 2. Check if identity is masked properly (e.g., using an alias)
                if 'reviewer_alias' not in review:
                    print("FAIL: No 'reviewer_alias' field found to identify the review.")
                    passed = False
                elif "Reviewer" not in review['reviewer_alias']:
                    print(f"FAIL: Reviewer alias '{review['reviewer_alias']}' does not look like a masked name.")
                    passed = False
            
            if passed:
                print("PASS: Reviewer identities are successfully hidden and masked.")
            else:
                print("FAIL: Reviewer identities or identifiers were exposed.")
        else:
            print(f"FAIL: Server returned status {response.status_code}")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_reviewer_anonymity()
