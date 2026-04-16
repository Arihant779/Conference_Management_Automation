import os

# --- API Endpoints ---
BASE_URL = os.getenv("BASE_URL", "http://localhost:4000/api")
ALLOCATION_URL = os.getenv("ALLOCATION_URL", "http://localhost:5000/api")

# --- Performance Thresholds (Seconds) ---
THRESHOLD_UPLOAD = 5.0
THRESHOLD_EMAIL = 3.0
THRESHOLD_DASHBOARD = 3.0

# --- Test Data ---
# Based on existing test scripts
REAL_CONF_ID = "63059494-0233-4dc7-9dae-2033519345e8"
TEST_USER_ID = "bd06436a-cd05-4f10-85ac-16f367bc4c94"

# --- Authentication Credentials (for RBAC tests) ---
# Replace with actual test accounts if necessary
ADMIN_EMAIL = "admin@test.com"
ADMIN_PWD = "AdminPassword123!"
REVIEWER_EMAIL = "reviewer@test.com"
REVIEWER_PWD = "ReviewerPassword123!"

# --- Portability Configuration ---
SUPPORTED_BROWSERS = ["chrome", "firefox", "brave"]
BRAVE_PATH = "/usr/bin/brave-browser" # Default for Linux
