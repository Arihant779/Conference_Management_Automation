import requests
import time

def run_consistency_test():
    print("Starting dashboard consistency test (20 repeated requests)...")
    times = []

    for i in range(20):
        try:
            start = time.time()
            requests.get("http://localhost:5000/dashboard")
            duration = time.time() - start
            times.append(duration)
            # print(f"Request {i+1}: {duration:.4f}s")
        except Exception as e:
            print(f"Request {i+1}: Error - {e}")

    fast = sum(1 for t in times if t <= 3)
    avg_time = sum(times) / len(times) if times else 0
    
    print(f"\nResults:")
    print(f"Fast requests (<= 3s): {fast}/20")
    print(f"Average response time: {avg_time:.4f}s")
    
    if fast >= 19:
        print("PASS: Dashboard consistency met (>= 19/20 requests <= 3 sec).")
    else:
        print(f"FAIL: Only {fast}/20 requests were within 3 seconds.")

if __name__ == "__main__":
    run_consistency_test()
