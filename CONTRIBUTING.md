# 🤝 Contributing to Arkodee

Thank you for your interest in contributing to Arkodee! This document outlines the standards, environment setup, and workflow required to develop and submit contributions to the codebase.

---

## 🛠️ Local Environment Setup

Arkodee is a monorepo containing three core services that must run concurrently during development:

1. **Backend Web API** (Django REST Framework)
2. **Frontend Web Client** (Vite + React)
3. **WebSocket Service** (Node.js + Socket.io)

### Prerequisites
* **Python**: `^3.11`
* **Node.js**: `>=18.0.0`
* **PostgreSQL**: Local server or connection URL (e.g., Neon Postgres)
* **Redis**: Local server or connection URL (e.g., Upstash Redis)

---

### Step-by-Step Installation

#### 1. Configure Global Environment Variables
Copy the root `.env.example` template to create your `.env` configurations inside each service directory:
* Backend: Copy `apps/backend/.env.example` to `apps/backend/.env`
* Frontend: Copy `apps/web/.env.example` to `apps/web/.env`
* WebSocket: Create `apps/websocket-service/.env` (if custom variables are needed, or let it fallback to defaults)

#### 2. Spin Up the Backend API
Navigate to the backend directory, initialize a virtual environment, install dependencies, and run migrations:
```powershell
# Navigate to backend
cd apps/backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# Linux/macOS:
source .venv/bin/activate

# Upgrade pip and install requirements
python -m pip install --upgrade pip
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed core system demo data & daily bug bounty problems
python seed_demo_data.py
python seed_daily_bugs.py

# Start Django development server
python manage.py runserver
```
The Django API will be listening on `http://127.0.0.1:8000`.

#### 3. Spin Up the WebSocket Service
The WebSocket service handles ELO matchmaking queues and live 1v1 arenas:
```powershell
# Navigate to websocket-service
cd apps/websocket-service

# Install dependencies
npm install

# Start the socket server in development mode
npm run dev
```
The WebSocket microservice will start listening on port `3000`.

#### 4. Spin Up the Frontend Application
Run the React Vite SPA frontend client:
```powershell
# Navigate to web frontend
cd apps/web

# Install dependencies
npm install

# Start development client
npm run dev
```
The React development server will start on `http://localhost:5173`.

---

## 🧪 Running Tests

### Django Backend Test Suite
Always verify your changes do not break authentication or sandbox execution by running the backend test suites:
```powershell
cd apps/backend
python manage.py test tests.test_auth
```

### Vite Frontend Build Verification
Before committing frontend UI changes, run a production build to check for syntax warnings, TypeScript/build errors, or code-splitting warnings:
```powershell
cd apps/web
npm run build
```

---

## 🌿 Git Branching & Workflow

We follow a strict branching model to keep our main branch clean and deployment-ready.

### 1. Branch Naming Conventions
* New Features: `feat/your-name/feature-name`
* Bug Fixes: `fix/your-name/bug-name`
* Documentation: `docs/your-name/doc-name`
* Hotfixes: `hotfix/your-name/issue-name`

### 2. Local Merge & Conflict Resolution
Before raising a Pull Request (PR) to merge into the `develop` branch, make sure your branch is up-to-date and free of merge conflicts:
```powershell
# Fetch latest updates
git fetch origin

# Merge the target branch into your feature branch
git merge origin/develop

# Resolve any conflicts, run build checks to verify, and stage changes
git add .
git commit -m "merge(develop): resolve conflicts and synchronize branches"
```

---

## ✏️ Coding Standards & Quality

* **Preserve Documentation**: Maintain existing docstrings, logic comments, and annotations inside codeblocks unless they are directly related to the bugs you are fixing.
* **Typing and Definitions**: Use clear typing and consistent camelCase for JSON keys/parameters in the frontend, and snake_case in Python backend schemas.
* **Error Sanitization**: Keep compiler errors sanitized. When editing the secure sandbox code runner, ensure that system-specific filepaths are stripped out before returning the output to the client.
