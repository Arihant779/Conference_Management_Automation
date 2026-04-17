import requests
import time
import os

def run_large_file_test():
    file_path = 'large.pdf'
    
    # Ensure the file exists (20MB)
    if not os.path.exists(file_path):
        print(f"Creating {file_path} (20MB) for testing...")
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.1\n' + b'0' * (20 * 1024 * 1024) + b'\n%%EOF')

    print(f"Starting 20MB upload test to http://localhost:5000/upload...")
    
    try:
        start = time.time()
        # User's provided snippet
        response = requests.post("http://localhost:5000/upload", files={'file': open(file_path, 'rb')})
        end = time.time()

        duration = end - start
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.json()}")
        print(f"Time taken: {duration:.4f} seconds")
        
        if duration <= 5:
            print("PASS: Upload completed within 5 seconds.")
        else:
            print("FAIL: Upload took longer than 5 seconds.")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the mock server is running on port 5000.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_large_file_test()
