import requests

def test_valid_login():
    print("TC 01: Valid Login Authentication")
    data = {"username": "user", "password": "correct"}
    try:
        response = requests.post("http://localhost:5000/login", data=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("PASS: Login success")
        else:
            print("FAIL: Expected 200")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_valid_login()
