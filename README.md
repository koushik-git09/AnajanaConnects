# Anjana Connects

Staff management and attendance management system for HP Gas Agency.

---

## Overview

**Anjana Connects** is an operational platform purpose-built for HP Gas Agencies to streamline daily staff operations, attendance tracking, facial verification, and payroll calculation.

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend**: FastAPI (Python 3.11), Uvicorn
- **Database**: MongoDB Atlas

---

## Project Structure

```text
AnjanaConnects/
├── frontend/
│   ├── public/             # Static assets (including official logo)
│   ├── src/
│   │   ├── assets/         # Project images and assets
│   │   ├── components/     # Reusable UI primitives (Button, Sheet, Icon, etc.)
│   │   ├── screens/        # Screen components (Home, Staff, Attendance, Salary, Login)
│   │   ├── data.ts         # Mock data foundation
│   │   ├── App.tsx         # Main app shell & screen state
│   │   ├── index.css       # Core design system tokens and styling
│   │   └── main.tsx        # React entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI application entrypoint
│   │   └── database/
│   │       └── mongodb.py  # Isolated MongoDB Atlas connection
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment configuration template
│
├── .gitignore              # Single unified Git ignore rules
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- MongoDB Atlas cluster connection URI

### Backend Setup

1. Create/activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   ```

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Configure environment variables:
   Copy `backend/.env.example` to `backend/.env` and supply your actual credentials:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   DATABASE_NAME=anjana_connects
   JWT_SECRET=your_secret_key
   ```

4. Start backend server:
   ```bash
   uvicorn app.main:app --app-dir backend --reload --port 8000
   ```
   Check health status at `http://127.0.0.1:8000/health`.

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   Access the web interface at `http://localhost:5173`.

---

## Development Roadmap

- **Phase 1: Foundation and cleanup** *(Current)*
- **Phase 2: Authentication**
- **Phase 3: Staff management**
- **Phase 4: Frontend routing and API integration**
- **Phase 5: Manual attendance**
- **Phase 6: Attendance dashboard / calendar**
- **Phase 7: Salary / payroll**
- **Phase 8: Face registration**
- **Phase 9: Face recognition attendance**
- **Phase 10: Liveness / anti-spoofing**
- **Phase 11: Reports and audit logs**
- **Phase 12: PWA + production deployment**
