# Conference Management Automation

A comprehensive platform for managing academic conferences, featuring AI-powered paper allocation, expert finder, and automated communication.

## 🚀 Quick Start (End-to-End Setup)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Arihant779/Conference_Management_Automation
   cd Conference_Management_Automation
   ```

2. **Configure Environment Variables**:
   Follow the [Environment Configuration](#environment-configuration) section to place your `.env` files.

3. **Install & Run Services**:
   Proceed with the detailed steps below for each component.

## 📁 Project Structure

*   **`backend/`**: Contains the server-side logic and services.
    *   **`server.js`**: Node.js Express server handling emails, expert finding, and health checks.
    *   **`paper_allocation/`**: Python Flask service for AI-powered paper-reviewer matching.
*   **`public/`**: Static assets for the frontend (index.html, manifest, etc.).
*   **`src/`**: React application source code.
    *   **`components/`**: Reusable UI modules, including Auth module and Dashboards for each role.
    *   **`context/`**: Global state management via React Context (AppContext).
    *   **`Supabase/`**: Database client configuration and interaction layer.
*   **`build/`**: (Ignored) Contains the production-ready frontend bundle.

```
conference-platform/
├── backend/
│   ├── paper_allocation/      # AI Service (Python/Flask)
│   │   ├── app.py             # Main Flask application
│   │   ├── requirements.txt   # Full dependencies (GPU)
│   │   └── requirements-cpu.txt # Fast dependencies (CPU)
│   ├── server.js              # Express.js server (Node.js)
│   ├── speakerFinder.js       # Expert search logic
│   └── package.json           # Node.js dependencies
├── public/                    # Static assets & index.html
├── src/                       # React frontend source
│   ├── components/            # UI Components
│   │   ├── Auth/              # Login/Register modules
│   │   ├── Conference/        # Conference view & creation
│   │   └── Dashboard/         # Role-specific dashboards
│   ├── context/               # Global state (AppContext.jsx)
│   ├── Supabase/              # Database client (supabaseclient.js)
│   ├── App.jsx                # Root React component
│   └── index.js               # React entry point
├── .env                       # Root environment file
├── package.json               # Frontend dependencies
└── tailwind.config.js         # Styling configuration
```

## 🚀 How to Run

### Prerequisites
- **Node.js** (v14+)
- **npm** or yarn
- **Python** (3.8+) - Use `python3` on macOS/Linux

---

### 1. Frontend Setup
From the root directory:
```bash
npm install
npm start
```
Runs at [http://localhost:3000](http://localhost:3000).

### 2. Express Backend (Node.js)
From the `backend` directory:
```bash
cd backend
npm install
npm start
```
Runs at [http://localhost:4000](http://localhost:4000).

### 3. Paper Allocation Service (Python)
From the `backend/paper_allocation` directory:
```bash
cd backend/paper_allocation

# Create virtual environment
# macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# Windows:
# python -m venv venv
# venv\Scripts\activate

# OPTION A: Fast Run (CPU only - Recommended for most users/macOS)
pip install -r requirements-cpu.txt

# OPTION B: Full Run (GPU support - Requires NVIDIA GPU)
# pip install -r requirements.txt

python app.py
```
Runs at [http://localhost:5000](http://localhost:5000).

---

### Environment Configuration

Two separate `.env` files are required and will be provided in the documentation:

1.  **Frontend/Root `.env`**
    *   **Content**: Contains Supabase URL and Anon Key.
    *   **Path**: `/Conference_Management_Automation/.env`
2.  **Backend `.env`**
    *   **Content**: Contains Groq API key and Gmail credentials.
    *   **Path**: `/Conference_Management_Automation/backend/.env`

Ensure both files are placed exactly at these paths to ensure all platform features work correctly.

---

## 🔐 Demo Accounts

Use these credentials to test different roles:

- **Organizer**: rohan@test.com / 123456
- **Reviewer**: rohan2@test.com / 123123
