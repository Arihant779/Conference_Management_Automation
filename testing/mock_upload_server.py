from flask import Flask, request, jsonify
import os

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB limit

# Mock Tokens
ADMIN_TOKEN = "ADMIN_TOKEN"
USER_TOKEN = "USER_TOKEN"

def get_token():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "ok", "message": "Security Mock Server is running"}), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # TC 09: Secure File Upload (Only PDF Allowed)
    if not file.filename.lower().endswith('.pdf'):
        print(f"[SECURITY] Blocked non-PDF upload: {file.filename}")
        return jsonify({"error": "Only PDF files are allowed"}), 400
    
    content = file.read()
    print(f"Received file: {file.filename}, size: {len(content) / 1024 / 1024:.2f} MB")
    
    return jsonify({
        "message": "File uploaded successfully",
        "filename": file.filename,
        "size_mb": len(content) / 1024 / 1024
    }), 200

@app.route('/dashboard', methods=['GET'])
def get_dashboard():
    # TC 03 & 10: Token Validation
    token = get_token()
    if not token:
        return jsonify({"error": "Unauthorized: No token provided"}), 401
    if token == "INVALID_TOKEN":
        return jsonify({"error": "Unauthorized: Invalid or expired token"}), 401
    
    return jsonify({
        "status": "success",
        "data": {"stats": {"users": 150, "papers": 45}}
    }), 200

@app.route('/admin', methods=['GET'])
def admin_portal():
    # TC 04 & 05: Role-Based Access Control
    token = get_token()
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    if token != ADMIN_TOKEN:
        print(f"[SECURITY] Access denied for token: {token}")
        return jsonify({"error": "Forbidden: Admin access required"}), 403
    
    return jsonify({"status": "success", "message": "Welcome to the Admin Portal"}), 200

@app.route('/paper/<paper_id>', methods=['GET'])
def get_paper(paper_id):
    # TC 06: Unauthorized Data Access
    print(f"[SECURITY] Data access check for paper {paper_id}")
    return jsonify({"error": "Access Denied: You do not have permission to view this paper"}), 403

@app.route('/login', methods=['POST'])
def login():
    data = request.form or request.json or {}
    username = data.get('username', '')
    password = data.get('password', '')

    # TC 07: SQL Injection Prevention
    sqli_payloads = ["' OR 1=1", "--", ";", "DROP TABLE"]
    if any(payload in username for payload in sqli_payloads):
        print(f"[SECURITY] Blocked SQLi attempt in username: {username}")
        return jsonify({"error": "Unauthorized: Potential SQL Injection detected"}), 401

    # TC 01 & 02: Login Authentication
    if username == "user" and password == "correct":
        return jsonify({
            "status": "success",
            "message": "Logged in successfully",
            "token": USER_TOKEN
        }), 200
    
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route('/submit', methods=['POST'])
def submit_paper():
    data = request.form or request.json or {}
    title = data.get('title', '')
    
    # TC 08: XSS Attack Prevention
    if "<script>" in title.lower():
        print(f"[SECURITY] Sanitizing input for potential XSS: {title}")
        title = title.replace("<script>", "[REMOVED]").replace("</script>", "")
        return jsonify({
            "status": "success",
            "message": "Paper submitted and sanitized",
            "sanitized_title": title
        }), 201

    return jsonify({"status": "success", "message": "Paper submitted successfully"}), 201

@app.route('/api/papers/review', methods=['POST'])
def review_paper():
    # TC 06: Immediate Decision Update
    data = request.json or {}
    paper_id = data.get('paper_id', 'unknown')
    # Simulate immediate consensus logic
    print(f"[TEST] Processing deciding review for paper {paper_id}...")
    return jsonify({
        "status": "success",
        "message": "Review submitted. Consensus reached.",
        "paper_id": paper_id,
        "new_status": "accepted",
        "timestamp": "2026-04-17T01:38:00Z"
    }), 200

@app.route('/api/papers/<paper_id>/reviews', methods=['GET'])
def get_paper_reviews(paper_id):
    # TC 08: Reviewer Anonymity
    print(f"[TEST] Fetching report for paper {paper_id}. Masking reviewer identities...")
    return jsonify({
        "paper_id": paper_id,
        "reviews": [
            {
                "reviewer_alias": "Reviewer 1",
                "score": 85,
                "feedback": "Methodology is solid but results section needs more detail."
            },
            {
                "reviewer_alias": "Reviewer 2",
                "score": 90,
                "feedback": "Excellent contribution to the field."
            }
        ],
        "status": "success"
    }), 200

if __name__ == '__main__':
    app.run(port=5000, threaded=True)
