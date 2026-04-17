import requests

def test_xss_prevention():
    print("TC 08: XSS Attack Prevention")
    data = {"title": "<script>alert('xss')</script>"}
    try:
        response = requests.post("http://localhost:5000/submit", data=data)
        print(f"Status: {response.status_code}")
        body = response.json()
        print(f"Response Body: {body}")
        if response.status_code == 201 and "[REMOVED]" in body.get('sanitized_title', ''):
            print("PASS: Script sanitized/handled safely")
        else:
            print("FAIL: Request failed or script not handled safely")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_xss_prevention()
