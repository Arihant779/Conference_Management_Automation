import requests

def test_sqli_prevention():
    print("TC 07: SQL Injection Prevention")
    # Inject SQL in login
    data = {"username": "' OR 1=1 --", "password": "any"}
    try:
        response = requests.post("http://localhost:5000/login", data=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print("PASS: SQL injection attack blocked")
        else:
            print(f"FAIL: Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_sqli_prevention()
