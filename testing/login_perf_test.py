import requests
import time

def run_login_test():
    print("Starting login response time test to http://localhost:5000/login...")
    
    try:
        start = time.time()
        # User's provided snippet
        response = requests.post("http://localhost:5000/login", data={"username":"user","password":"pass"})
        end = time.time()

        duration = end - start
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.json()}")
        print(f"Time taken: {duration:.4f} seconds")
        
        if duration <= 2:
            print("PASS: Login API responded within 2 seconds.")
        else:
            print("FAIL: Login API took longer than 2 seconds.")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the mock server is running on port 5000.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_login_test()
