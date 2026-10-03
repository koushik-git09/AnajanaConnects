# Anjana Connects — Enterprise Staff & Biometric Attendance Platform

**Anjana Connects** is an enterprise-grade operational management platform purpose-built for HP Gas Agencies to streamline staff records, live biometric face-recognition attendance, anti-spoofing verification, real-time payroll calculations, and compliance reporting.

---

## Architecture Overview

```text
Anjana Connects/
├── frontend/                     # React 19 + TypeScript + Vite + PWA
│   ├── public/
│   │   ├── logo.png              # Official agency brand logo (1024x1024)
│   │   ├── pwa-192x192.png       # Standard PWA launcher icon
│   │   ├── pwa-512x512.png       # High-res PWA icon
│   │   ├── maskable-icon-512x512.png # Android adaptive maskable icon
│   │   ├── apple-touch-icon.png  # iOS Home Screen icon
│   │   ├── favicon.png           # Browser tab favicon
│   │   ├── models/face/          # Lightweight client-side ONNX models
│   │   │   ├── yunet/            # YuNet face detector & landmark aligner
│   │   │   └── sface/            # SFace 128-D facial feature embedder
│   │   └── wasm/                 # ONNX Runtime Web CPU/WASM binaries
│   ├── src/
│   │   ├── auth/                 # JWT Authentication context & protected routes
│   │   ├── components/           # Design system primitives (Button, Field, Pill, Sheet)
│   │   ├── features/face/        # Client-side biometric detection & liveness pipeline
│   │   ├── screens/              # Dashboard, Staff, Attendance, Salary, Reports, Settings
│   │   └── services/api.ts       # Typed API client with tenant isolation
│   ├── package.json
│   ├── vite.config.ts            # Vite + Tailwind + VitePWA + ONNX WASM alias
│   └── .env.example
│
├── backend/                      # FastAPI (Python 3.11) + PyMongo + PyJWT
│   ├── app/
│   │   ├── core/                 # App configuration, security, JWT dependencies
│   │   ├── database/             # MongoDB Atlas connection & compound indexes
│   │   ├── routes/               # Modular REST endpoints
│   │   ├── schemas/              # Pydantic validation models
│   │   ├── services/             # Business & aggregation logic
│   │   └── main.py               # FastAPI application lifecycle & global error handler
│   ├── requirements.txt
│   └── .env.example
│
├── .gitignore                    # Secrets, virtualenvs, node_modules, and dist ignored
└── README.md
```

---

## Biometric & Face Recognition Architecture

1. **Lightweight Browser-Side Inference**:
   - Detection: OpenCV YuNet (5-point facial landmark normalization).
   - Embedding: OpenCV SFace producing normalized 128-dimensional cosine feature vectors.
   - Matching: Cosine distance thresholding against employee biometric templates.
2. **Anti-Spoofing & Liveness Protection**:
   - Multi-cue temporal texture variance, micro-motion tracking, and blink detection prevent printed photos and video screen replay attacks.
3. **ONNX Runtime Web WASM Configuration**:
   - The runtime uses multi-threaded SIMD CPU WASM (`ort-wasm-simd-threaded.wasm`).
   - JSEP / WebGPU / WebNN dynamic modules are explicitly excluded via Vite aliases to ensure deterministic, zero-config cross-browser execution on all client hardware.

---

## Progressive Web App (PWA) Features

- **Installable Application**: Configured via Web App Manifest with `display: standalone` and custom branding.
- **Service Worker (Workbox)**:
  - Precaches application shell, static assets, WASM binaries, and icons.
  - Static ONNX models are cached using `StaleWhileRevalidate`.
  - **Strict Security Rule**: All `/api/*` endpoints are explicitly marked `NetworkOnly` and excluded from service worker caching to ensure zero stale employee, payroll, or biometric data is ever stored offline.
- **Offline Resilience**: Clean connection notification displayed when server connectivity is interrupted. Attendance is never spoofed or recorded without authoritative backend confirmation.

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

| Variable | Description | Example / Default |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://...` |
| `DATABASE_NAME` | Database name | `anjana_connects` |
| `JWT_SECRET` | 64-character random secret key for JWT signing | *Generate randomly* |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session token lifetime | `60` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated for multi-domain) | `http://localhost:5173,https://app.youragency.com` |
| `SMTP_HOST` | SMTP server for password reset emails | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USERNAME` | SMTP account email | `owner@agency.com` |
| `SMTP_PASSWORD` | SMTP app password | *App password* |
| `SMTP_FROM_EMAIL` | From address for outgoing emails | `noreply@agency.com` |
| `SMTP_FROM_NAME` | Sender display name | `Anjana Connects` |
| `PASSWORD_RESET_EXPIRE_MINUTES` | Password reset link expiration | `15` |

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

| Variable | Description | Example / Default |
|---|---|---|
| `VITE_API_URL` | Base URL for FastAPI backend endpoints | `http://localhost:8000/api` |

---

## Local Development Commands

### 1. Backend Setup & Run

```bash
# In backend directory
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # On Windows
pip install -r requirements.txt

# Start backend dev server
uvicorn app.main:app --reload --port 8000
```

Verify backend health at `http://localhost:8000/health`.

### 2. Frontend Setup & Run

```bash
# In frontend directory
npm install
npm run dev
```

Access the frontend at `http://localhost:5173`.

---

## Production Build & Verification

### 1. Build Frontend Production Bundle

```bash
cd frontend
npm run build
```

This compiles TypeScript, bundles React 19, generates the PWA service worker (`dist/sw.js`), web manifest (`dist/manifest.webmanifest`), and copies WASM/model assets.

### 2. Run TypeScript Typecheck

```bash
cd frontend
npx tsc --noEmit
```

### 3. Test Production Preview Locally

```bash
cd frontend
npx vite preview --port 4173
```

Verify the application, manifest, and service worker load without errors.

---

## Deployment Checklist (Manual Steps)

Before taking Anjana Connects live on your cloud hosting infrastructure:

- [ ] **MongoDB Atlas**:
  - Whitelist your production backend server IP / range in Network Access.
  - Verify database user has read/write privileges on `DATABASE_NAME`.
- [ ] **Backend Hosting** (e.g. Render, Railway, AWS ECS, DigitalOcean App Platform):
  - Set all production environment variables from `backend/.env.example`.
  - Set a cryptographically secure `JWT_SECRET`.
  - Set `FRONTEND_URL` to your production frontend domain (e.g. `https://app.anjana.in`).
  - Verify `/health` returns `{"status":"healthy","database":"connected"}`.
- [ ] **Frontend Hosting** (e.g. Vercel, Netlify, Cloudflare Pages, S3/CloudFront):
  - Set `VITE_API_URL` to your production backend URL (e.g. `https://api.anjana.in/api`).
  - Run `npm run build` as the deployment build command.
  - Set output directory to `dist`.
- [ ] **HTTPS / SSL Certificate**:
  - **Mandatory**: Web camera access (`navigator.mediaDevices.getUserMedia`) requires a secure HTTPS context in production.
- [ ] **PWA & Mobile Installability**:
  - Verify Chrome / Safari displays the "Install app" prompt on mobile devices.
  - Verify `manifest.webmanifest` and service worker load with status 200.
- [ ] **Biometrics Verification**:
  - Test face registration and face-recognition attendance check-in under production HTTPS.
