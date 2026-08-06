# ARKodee

## Quick Setup

### 1) Install dependencies

Backend:

```powershell
cd apps/backend
python -m pip install -r requirements.txt
```

Frontend:

```powershell
cd apps/web
npm install
```

### 2) Configure environment variables

Use these templates:

- Root: `.env.example`
- Backend: `apps/backend/.env.example`
- Web: `apps/web/.env.example`

Required for Google login:

```env
GOOGLE_OAUTH_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

Notes:

- `GOOGLE_OAUTH_CLIENT_ID` is used by Django backend to verify Google ID tokens.
- `VITE_GOOGLE_CLIENT_ID` is used by the React app to initialize the Google login button.

### 3) Run apps

Backend:

```powershell
cd apps/backend
python manage.py runserver
```

Frontend:

```powershell
cd apps/web
npm run dev
```

### 4) Verify auth flow

- Manual auth: Email check -> Register/Login works.
- Google auth: Continue with Google button works and lands on dashboard.

### 5) Run backend auth tests

```powershell
cd apps/backend
python manage.py test tests.test_auth
```

### SET-UP TO RUN THE PROJECT FOR THE FIRST TIME 

# Navigate to backend directory
cd ARKodee/apps/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Verify installation
python manage.py check
