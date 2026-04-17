import requests
import time
import os

def run_upload_srs_test():
    print("Starting File Upload Response Time test (10 repeated 20MB uploads)...")
    file_path = 'large.pdf'
    
    # Ensure the 20MB file exists
    if not os.path.exists(file_path):
        print(f"Creating {file_path} (20MB) for testing...")
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.1\n' + b'0' * (20 * 1024 * 1024) + b'\n%%EOF')

    times = []

    for i in range(10):
        try:
            start = time.time()
            # User's provided snippet
            requests.post("http://localhost:5000/upload", files={'file': open(file_path, 'rb')})
            duration = time.time() - start
            times.append(duration)
            print(f"Upload {i+1}: {duration:.4f}s")
        except Exception as e:
            print(f"Upload {i+1}: Error - {e}")

    fast = sum(1 for t in times if t <= 5)
    avg_time = sum(times) / len(times) if times else 0
    
    print(f"\nResults:")
    print(f"Fast uploads (<= 5s): {fast}/10")
    print(f"Average response time: {avg_time:.4f}s")
    
    if fast >= 9:
        print("PASS: File upload response time met (at least 9/10 uploads <= 5 sec).")
    else:
        print(f"FAIL: Only {fast}/10 uploads were within 5 seconds.")

if __name__ == "__main__":
    run_upload_srs_test()
