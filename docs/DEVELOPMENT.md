# PRISMS Local Development Guide

This guide describes how to configure, run, debug, and test the **PhD Research & Institutional Scholars Management System (PRISMS)** in a local development environment.

---

## 1. Prerequisites

- **Node.js:** v22.x or later (`node -v` >= 22.0.0)
- **npm:** v10.x or later
- **PostgreSQL:** v16.x or later (local installation or via Docker/Podman)
- **Git:** Standard git client

---

## 2. Quickstart Setup

### Step 1: Clone Repository
```bash
git clone <repository_url> PRISMS
cd PRISMS
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

### Step 3: Configure Environment Variables

#### Backend Configuration (`backend/.env`):
Create `backend/.env` (referencing `backend/.env.example`):
```ini
PORT=4000
FRONTEND_URL="http://localhost:3000"
DATABASE_URL="postgresql://prisms_app:<db_password>@localhost:5433/prisms?schema=public&host=/tmp"
DATABASE_URL_TEST="postgresql://prisms_app:<db_password>@localhost:5433/prisms_test?schema=public&host=/tmp"
JWT_ACCESS_SECRET="your-32-character-secret-key-for-access-jwt-token"
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=7
MAX_THESIS_FILE_SIZE_BYTES=20971520
THESIS_STORAGE_PATH="./storage/theses"
NODE_ENV="development"
```

#### Frontend Configuration (`frontend/.env.local`, optional):
Next.js automatically proxies API routes (`/auth/*`, `/theses/*`, `/api/*`) to `http://127.0.0.1:4000` via rewrites in `next.config.ts`. Optionally, you can set:
```ini
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Step 4: Run Database Migrations and Seed
```bash
# Generate Prisma Client
npm --prefix backend run prisma:generate

# Deploy migrations to dev database
npm --prefix backend run prisma:migrate:deploy

# Seed initial institutional accounts and workflow definitions
npm --prefix backend run seed
```

---

## 3. Running Development Servers

### Starting the Backend Server
```bash
npm --prefix backend run dev
# Starts Express on http://localhost:4000 with tsx watch
```

### Starting the Frontend Server
```bash
npm --prefix frontend run dev
# Starts Next.js on http://localhost:3000
```

---

## 4. Default Seed Accounts

The dev database seed script initializes standard accounts configured with password `Password123!`:

| Portal / Role | Email | Name | Department / Authority |
|:---|:---|:---|:---|
| **Scholar** | `aarav.sharma@example.test` | Aarav Sharma | PhD Scholar (`21PHDCSE01`) |
| **Supervisor** | `supervisor1@example.test` | Dr. Rajesh Kumar | CSE Faculty |
| **HOD** | `hod.cse@example.test` | Prof. Anil Verma | Head, Dept. of CSE |
| **Chairperson SDPC** | `sdpc@example.test` | Dr. Vikram Malhotra | Senate Degree Review |
| **Dean Academics** | `dean.acad@example.test` | Prof. Sanjay Gupta | Office of Dean (Academic) |
| **Chairperson Senate** | `senate.chair@example.test` | Director | Senate Final Authority |
| **Admin** | `admin@example.test` | System Administrator | Institutional IT |

---

## 5. Development Verification & Scripts

### Running Integration Tests
```bash
npm --prefix backend test
# Runs 66+ tests covering all thesis lifecycle actions, parallel routing, and access control
```

### Typechecking
```bash
# Backend TypeScript check
npm --prefix backend run build

# Frontend TypeScript check
npm --prefix frontend run typecheck
```

### Frontend Production Build
```bash
npm --prefix frontend run build
```

---

## 6. Troubleshooting Common Issues

### 1. PostgreSQL Connection Error
If `pg_isready` fails or Prisma throws connection refused:
- Verify PostgreSQL is running on the expected port (e.g. `5433` vs `5432`).
- Check that the Unix domain socket exists in `/tmp` or connect via TCP `127.0.0.1:5433`.

### 2. PDF.js Worker Loading Error
- Ensure [`frontend/public/pdf.worker.min.mjs`](file:///home/ankurgupta/PRISMS/frontend/public/pdf.worker.min.mjs) is present.
- The worker is bundled locally to eliminate external CDN dependencies and ensure offline operation.

### 3. HOD Download Rejection
- This is a statutory feature, not a bug. In accordance with NIT Hamirpur regulations, HOD accounts are restricted to secure in-portal reading. Attempting to download will return `403 DOWNLOAD_FORBIDDEN_FOR_ROLE`.
