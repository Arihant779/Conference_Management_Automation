import requests
import time

def run_email_test():
    print("Starting email trigger response time test to http://localhost:5000/send-email...")
    
    try:
        start = time.time()
        # User's provided snippet
        response = requests.get("http://localhost:5000/send-email")
        end = time.time()

        duration = end - start
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.json()}")
        print(f"Time taken: {duration:.4f} seconds")
        
        if duration <= 3:
            print("PASS: Email API responded within 3 seconds.")
        else:
            print("FAIL: Email API took longer than 3 seconds.")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the mock server is running on port 5000.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_email_test()
