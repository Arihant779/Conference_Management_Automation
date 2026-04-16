import requests
import time
import os

def run_test():
    file_path = 'Attention Is all you need.pdf'
    
    # Ensure the file exists
    if not os.path.exists(file_path):
        print(f"Creating {file_path} for testing...")
        with open(file_path, 'wb') as f:
            f.write(b'%PDF-1.1\n' + b'a' * 1024 * 1024 + b'\n%%EOF') # 1MB dummy PDF

    print(f"Starting upload test to http://localhost:5000/upload...")
    
    try:
        start = time.time()
        # Using the exact code provided by the user
        response = requests.post("http://localhost:5000/upload", files={'file': open(file_path, 'rb')})
        end = time.time()

        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.json()}")
        print(f"Time taken: {end - start:.4f} seconds")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the mock server is running on port 5000.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_test()
