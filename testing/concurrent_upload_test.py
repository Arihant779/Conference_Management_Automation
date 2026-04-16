import requests
import time
import threading
import os

def upload():
    file_path = 'test.pdf'
    # Ensure file exists for each thread
    if not os.path.exists(file_path):
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.1\n' + b'Dummy content' + b'\n%%EOF')
            
    try:
        response = requests.post("http://localhost:5000/upload", files={'file': open(file_path, 'rb')})
        if response.status_code == 200:
            print(f"Thread {threading.current_thread().name}: Success")
        else:
            print(f"Thread {threading.current_thread().name}: Failed (Status {response.status_code})")
    except Exception as e:
        print(f"Thread {threading.current_thread().name}: Error - {e}")

def run_concurrent_test():
    print("Starting 5 concurrent uploads test...")
    threads = [threading.Thread(target=upload, name=f"User-{i+1}") for i in range(5)]

    start = time.time()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    end = time.time()

    duration = end - start
    print(f"\nTotal time for 5 concurrent uploads: {duration:.4f} seconds")
    
    if duration <= 7:
        print("PASS: All uploads completed within 5-7 seconds.")
    else:
        print("FAIL: Concurrent uploads took longer than 7 seconds.")

if __name__ == "__main__":
    run_concurrent_test()
