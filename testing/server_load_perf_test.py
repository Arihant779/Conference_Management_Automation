import requests
import time

def run_load_test():
    print("Starting server load test (50 quick GET requests)...")
    
    try:
        start = time.time()
        for i in range(50):
            requests.get("http://localhost:5000/")
        end = time.time()

        total_duration = end - start
        avg_duration = total_duration / 50
        
        print(f"\nResults:")
        print(f"Total time for 50 requests: {total_duration:.4f} seconds")
        print(f"Average response time: {avg_duration:.4f} seconds")
        
        if avg_duration <= 1:
            print("PASS: Average response time is ≤ 1 second.")
        else:
            print("FAIL: Average response time is > 1 second.")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the mock server is running on port 5000.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_load_test()
