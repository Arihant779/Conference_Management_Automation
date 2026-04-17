import requests
import os

def test_file_type_restriction():
    print("TC 09: Secure File Upload (Only PDF Allowed)")
    # Create a dummy .exe file
    with open('test.exe', 'wb') as f:
        f.write(b'Mock executable content')
    
    try:
        with open('test.exe', 'rb') as f:
            files = {'file': f}
            response = requests.post("http://localhost:5000/upload", files=files)
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            print("PASS: Non-PDF file rejected")
        else:
            print(f"FAIL: Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        if os.path.exists('test.exe'):
            os.remove('test.exe')

if __name__ == "__main__":
    test_file_type_restriction()
