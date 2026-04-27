# 🚀 ConfHub: Conference Automation Platform



## 📖 Description

**ConfHub** is an end-to-end conference management solution designed to streamline the complex workflows of academic and professional conventions. Built with a modern full-stack architecture, it leverages **AI-driven automation** to handle tasks that typically consume hundreds of manual hours.

The platform provides a unified ecosystem for organizers to manage multiple conferences, automate peer-review processes through semantic matching, and discover global experts for keynote invitations. By utilizing high-fidelity animations and a role-specific dashboard system, it ensures a premium user experience for every stakeholder—whether they are submitting a groundbreaking research paper or orchestrating a three-day global event.

---

## 📑 Table of Contents
- [✨ Features](#-features)
- [🛠️ Tech Stack](#-tech-stack)
- [⚙️ Installation](#-installation)
- [▶️ How to Run](#-how-to-run)
- [📁 Project Structure](#-project-structure)
- [📝 Usage](#-usage)
- [📸 Screenshots / Demo](#-screenshots--demo)
- [👤 Author / Credits](#-author--credits)

---

## ✨ Features

### 🤵 Organizer Workflow & Management
- **Multi-Conference Dashboard**: Create, update, and monitor multiple conferences simultaneously from a single administrative panel.
- **Dynamic Team Creation**: Invite reviewers and presenters via email-driven workflows. Manage roles and permissions with a built-in Role-Based Access Control (RBAC) system.
- **Collaborative Teams**: Assign specific management duties to co-organizers with varying levels of data authorization.

### 🤖 AI-Powered Paper Allotment
- **Semantic Matching Engine**: Uses **Sentence-Transformer** (NLP) models to compute the cosine similarity between paper abstracts and reviewer expertise profiles.
- **Optimization Strategy**: Implements linear programming (via PuLP) to ensure optimal distribution—matching the best-qualified reviewers while respecting individual workload limits.
- **Automated Workflow**: Transition papers from "Submitted" to "Under Review" with a single click, notifying assigned reviewers instantly.

### 🔍 AI Speaker Finder & Lead Generation
- **Global Expert Discovery**: A multi-mode search engine that scrapes academic profiles across international universities, IITs, and NITs.
- **Lead Generation**: Automatically discovers verified contact emails and research profiles of potential keynote speakers using Serper.dev APIs.
- **Shortlist Manager**: Save and manage a list of potential speakers for outreach campaigns.

### 📧 Intelligent Communications
- **LLM Email Composer**: Integrated **Llama 3.3 (Groq)** AI for generating professional, context-weighted email drafts for invitations, acceptances, and rejections.
- **Automated Scheduling**: Schedule bulk emails for conference updates or paper notifications with real-time delivery tracking.

### 📅 Event Logistics & Assets
- **Visual Session Scheduler**: A drag-and-drop interface for building conference timelines. Features multi-room support and real-time conflict detection (overlapping time slots or speakers).
- **Procedural Certificate Engine**: A canvas-based rendering system that generates personalized high-resolution PDFs (jsPDF) for attendees, presenters, and reviewers.
- **Paper Repository**: Secure, cloud-hosted storage for research documents with support for metadata searching and large file uploads.

---

## 🛠️ Tech Stack

### Frontend Ecosystem
- **React 18**: Core UI library focused on component modularity.
- **Tailwind CSS**: Utility-first styling for a sleek, responsive design.
- **Framer Motion**: High-fidelity micro-interactions and page transitions.
- **Lucide React**: Modular vector icon system.

### Backend & AI Infrastructure
- **Node.js (Express)**: Primary API gateway and service orchestrator.
- **Python (Flask)**: Dedicated microservice for NLP tasks and paper-to-reviewer matching algorithms.
- **NLP Models**: PyTorch-based Sentence-Transformers for semantic understanding.
- **AI Services**: Groq Cloud (Llama 3.3) for generative text tasks.

### Database & Security
- **Supabase (PostgreSQL)**: Relational data storage with real-time synchronization.
- **Supabase Auth**: Secure identity management with OTP-based email verification.
- **Supabase Storage**: Managed cloud buckets for PDF papers and image assets.

---

## ⚙️ Installation

### 📋 Prerequisites
- **Node.js** (v20.x+)
- **Python** (v3.8 - v3.11)
- **Git**
- **Supabase** account

### 1. Project Initialization
```bash
# Clone the repository
git clone https://github.com/Arihant779/Conference_Management_Automation
cd Conference_Management_Automation

# Install Node.js dependencies
npm install
```

### 2. NLP Service Setup
```bash
cd backend/paper_allocation
python -m venv venv

# Activate Virtual Environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements-cpu.txt
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Frontend Keys
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# Backend Keys
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
SERPER_API_KEY=your_serper_api_key

# SMTP Configuration
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
```

---

## ▶️ How to Run

To get the full platform running, you need to start three distinct processes:

### 1. Start the React Frontend
```bash
# From the root directory
npm start
```

### 2. Start the Express Backend
```bash
# Open a new terminal from the root directory
npm run backend
```

### 3. Start the Python NLP Service
```bash
# Open a new terminal
cd backend/paper_allocation
# Ensure venv is activated
python app.py
```

---

## 📁 Project Structure

```bash
├── api/                # Vercel Serverless Function entry (index.mjs)
├── server/             # Node.js Backend Core
│   ├── routes/         # API Endpoint Definitions
│   ├── services/       # Email, LLM, and Scheduling Logic
│   └── middleware/     # Auth verification and RBAC checks
├── backend/            # Specialized Microservices
│   └── paper_allocation/ # Python Flask Service for AI Matching
├── src/                # React Frontend Source
│   ├── components/     # UI Building Blocks (Auth, Dashboards, Common)
│   ├── context/        # App-wide State Management (AppContext)
│   └── hooks/          # Custom logical hooks (usePermissions)
├── testing/            # Pytest-based Automated Testing Suite
└── public/             # Static Assets and Media
```

---

## 📝 Usage

### 🔐 Multi-Role Access
1. **Register**: Sign up using your email and verify via the sent OTP.
2. **Setup Profile**: Choose your primary role (Organizer, Reviewer, or Presenter).

### 🏆 Organizer Workflow
1. **Create a Conference**: Define dates, venues, and submission deadlines.
2. **Invite Team**: Add reviewers by entering their email addresses in the "Teams" tab.
3. **Run Paper Allocation**: After papers are submitted, use the "Paper Allocation" dashboard to run the AI matching algorithm.
4. **Schedule Sessions**: Use the visual calendar to assign papers to specific time slots and rooms.

### ✍️ Presenter/Reviewer Workflow
- **Presenters**: Upload PDF papers and track their review status (Under Review/Accepted/Rejected).
- **Reviewers**: Access assigned papers, read them directly in the browser, and submit their scores/feedback.

---

## 📸 Screenshots / Demo

Visual walkthroughs, feature demonstrations, and UI benchmarks are documented in the project report.

👉 **Live Demo / Video Walkthrough**: [Drive Link](https://drive.google.com/drive/folders/1O4mrjFL_g2m0TWHfWbRipuYSLP6z2tsZ)
👉 **View Full Documentation**: [Conference Report.pdf](file:///c:/Users/ASUS/Desktop/Additional/Conference%20Automation/Conference_Management_Automation/Conference%20Report.pdf)

---

## 👤 Author / Credits

This project was developed by:

| Name | Roll Number |
| :--- | :--- |
| **Rohan** | 230001069 |
| **Arihant Jain** | 230001009 |
| **Jeel Savsani** | 230001033 |
| **Raunak Anand** | 230001067 |
| **Bramhshree** | 230001035 |

---

*Distributed under the **MIT License**. Created with ❤️ for the Academic Community.*

