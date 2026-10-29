# PRISMS — PhD Research & Institutional Scholars Management System

Production-ready backend for PhD thesis submission, workflow routing, approval orchestration, revision loops, and secure document management at NIT Hamirpur.

---

## 1. Project Overview & Architecture

PRISMS provides a secure, auditable, and multi-stage academic workflow engine:
1. **Student Submission:** Authenticated doctoral scholars manage drafts, upload thesis PDFs into private filesystem storage with SHA-256 integrity checks, and formally submit their thesis.
2. **Supervisor Review:** Assigned supervisors inspect thesis versions, read comments, and forward to authorized departmental HODs, or return for revisions.
3. **Departmental & HOD Review:** Head of Department reviews the thesis inline within the portal. **HOD is strictly prohibited from downloading thesis documents.** HOD can forward to Chairperson SDPC, Dean Academics, or both in parallel.
4. **Institutional Parallel Review:** Chairperson SDPC and Dean Academics review independently. Revisions or rejections halt parallel branches safely.
5. **Final Senate Approval:** Chairperson Senate grants final approval (`APPROVED`), transitioning the thesis to `CLOSED` and recording formal academic completion.
6. **Revision & History Tracking:** Returned theses allow scholar resubmission (creating immutable new versions `N+1`) while preserving all prior drafts, files, and remarks.
7. **Supervisor Scholar Dashboard:** Supervisors can track current and completed scholars, review timelines, and view full submission dossiers with pagination and search.

---

## 2. Technology Stack

### Backend
- **Runtime & Language:** Node.js (v22+), TypeScript (ES2022, NodeNext resolution, executed via `tsx`)
- **Web Framework:** Express 5.x
- **Database & ORM:** PostgreSQL 16+ with Prisma ORM 6.x
- **Authentication:** Argon2id password hashing, short-lived JWT access tokens, rotating opaque refresh tokens stored as SHA-256 hashes in `sessions` table
- **File Upload & Storage:** Multer memory storage, magic bytes signature validation (`%PDF-`), SHA-256 checksums, private filesystem storage outside web root
- **Validation & Security:** Zod schemas, Helmet, CORS, Express-Rate-Limit, central error handler
- **Testing:** Node.js native test runner (`node:test`, `node:assert/strict`) with Supertest

### Frontend
- **Framework & Runtime:** Next.js 15.2.1 (App Router), React 19, TypeScript 5.8
- **Styling & Design System:** Tailwind CSS 3.4 with custom NIT Hamirpur color tokens (Surface `#f7f7f6`, Charcoal `#171717`, Brand Gold `#daa32f`, Primary Green `#16a34a`)
- **Visual Design Source:** Figma File `SKPTGM8RvLhsCdfYotKCpb` (9 top-level canvas pages faithfully mapped)
- **Architecture:** Responsive application shell, bilingual institutional branding (English & Hindi), dynamic multi-role context switcher, resilient API client with mock fallback for demo stability

---

## 3. Repository Structure

```
PRISMS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Canonical database schema
│   │   ├── migrations/             # Applied PostgreSQL migrations
│   │   └── seed.ts                 # Idempotent dev seed script (CSE department + accounts)
│   ├── src/
│   │   ├── app.ts                  # Express application setup & route mounting
│   │   ├── server.ts               # HTTP server listener and graceful shutdown
│   │   ├── config/
│   │   │   └── env.ts              # Validated environment variables (Zod)
│   │   ├── lib/
│   │   │   ├── prisma.ts           # PrismaClient singleton instance
│   │   │   ├── storage.ts          # Private storage, PDF magic bytes & path traversal protection
│   │   │   ├── audit.ts            # Audit logging to audit_events table
│   │   │   ├── errors.ts           # AppError class
│   │   │   └── mailer.ts           # SMTP / console mail dispatcher
│   │   ├── middleware/
│   │   │   ├── auth.ts             # requireAuth, requireRole, AuthContext
│   │   │   ├── errorHandler.ts     # Centralized error handler
│   │   │   └── validate.ts         # Zod request body validation middleware
│   │   ├── modules/
│   │   │   ├── auth/               # Signup, login, refresh, password reset
│   │   │   └── thesis/             # Submission, workflow routing, file view/download, tracking
│   │   └── generated/prisma/       # Generated Prisma Client (gitignored)
│   ├── storage/theses/             # Private thesis PDF storage (gitignored)
│   ├── .env.example                # Example environment configuration
│   └── package.json
├── frontend/                       # Next.js 15 Figma-guided UI application
│   ├── public/assets/              # Official NITH logo & SVG vector icon library
│   ├── src/
│   │   ├── app/                    # 27 App Router routes (Student, Faculty, Public)
│   │   │   ├── student/            # Student Portal (dashboard, submit wizard, details, history...)
│   │   │   ├── faculty/            # Faculty Portal (dashboard, queue, reviews, hod, scholars...)
│   │   │   ├── login/              # Multi-role authentication & context switcher
│   │   │   └── page.tsx            # Institutional landing page
│   │   ├── components/             # Reusable UI components & ApplicationShell
│   │   └── lib/                    # api.ts (backend client & mock fallback), auth.tsx context
│   ├── tailwind.config.ts          # Extracted Figma tokens
│   └── package.json
├── docs/
│   ├── API.md                      # Complete REST API reference
│   ├── FRONTEND_FIGMA_MAPPING.md   # Figma node mapping, color tokens, and 27-route directory
│   ├── THESIS_WORKFLOW.md          # State machine, sequence, and Mermaid diagrams
│   ├── AUTHORITY_ROUTING.md        # Authority matrix & recipient resolution rules
│   ├── SECURITY.md                 # Security architecture, controls, and viewer limitations
│   └── TESTING.md                  # Automated test guide & verified execution report
├── compose.yaml                    # PostgreSQL service definition
└── README.md
```

---

## 4. Getting Started

### 4.1 Prerequisites
- **Node.js:** v22.x or later
- **PostgreSQL:** v16+ (local service, or via Docker/Podman using `compose.yaml`)

### 4.2 Local Environment Setup
From `backend/`:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables in `backend/.env`:
   ```ini
   DATABASE_URL="postgresql://prisms_app:Ankur1704%40@localhost:5433/prisms?schema=public"
   JWT_ACCESS_SECRET="prisms-development-jwt-access-secret-32-chars-minimum-key"
   MAX_THESIS_FILE_SIZE_BYTES=20971520
   THESIS_STORAGE_PATH="./storage/theses"
   FRONTEND_URL="http://localhost:3000"
   PORT=4000
   ```

### 4.3 Database Setup, Migrations & Seeding
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply migrations to PostgreSQL
npx prisma migrate deploy

# 4. Seed development accounts & workflow stages
npm run seed
```

### 4.4 Running the Application

#### Backend (Port 4000)
```bash
cd backend

# Start development server with live reload
npm run dev

# Compile TypeScript
npm run build

# Start production server
npm start
```
The backend API listens on `http://localhost:4000`.

#### Frontend (Port 3000)
```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start Next.js development server
npm run dev

# Type check
npm run typecheck

# Build for production (pre-renders all 27 routes)
npm run build

# Start production server
npm start
```
The PRISMS web application is available at `http://localhost:3000`.

---

## 5. Development Accounts (Seed Data)

The seed script creates the **CSE Department**, 11 roles, 5 workflow stages, and these development accounts with default password `ChangeMe-Dev-123` (or `SEED_PASSWORD`):

| Email | Role Code | Scope | Notes |
|:---|:---|:---|:---|
| `student1@example.test` | `STUDENT` | CSE Dept | Supervised by `supervisor1`, Roll: `21PHDCSE01` |
| `student2@example.test` | `STUDENT` | CSE Dept | Supervised by `supervisor2`, Roll: `21PHDCSE02` |
| `supervisor1@example.test`| `SUPERVISOR`| CSE Dept | Associate Professor FAC001 |
| `supervisor2@example.test`| `SUPERVISOR`| CSE Dept | Professor FAC002 |
| `hod.cse@example.test` | `HOD` | CSE Dept | **Strict download prohibition** |
| `ddpc.cse@example.test`| `DDPC` | CSE Dept | Observer visibility on departmental submissions |
| `sdpc@example.test` | `CHAIRPERSON_SDPC` | Institute | Senate Doctoral Programme Committee Chair |
| `dean@example.test` | `DEAN_ACADEMICS` | Institute | Dean of Academic Affairs |
| `chairman@example.test` | `CHAIRPERSON_SENATE` | Institute | Director & Chairman Senate (Final Approval) |
| `admin@example.test` | `ADMIN` | Institute | Portal Administrator |

---

## 6. Thesis Lifecycle & Permission Summary

```
Student Draft ──► Upload PDF ──► Formal Submit ──► Stage 1: Supervisor Review
                                                         │
                        ┌────────────────────────────────┴──────────────────────┐
                        ▼                                                       ▼
               Return / Revision                                      Forward to HOD (CSE)
                        ▲                                                       │
                        │                                                       ▼
                Student Resubmits                                     Stage 2: HOD Review
                   (Version N+1)                                     (View Only - NO DOWNLOAD)
                        ▲                                                       │
                        │                                ┌──────────────────────┴──────────────────────┐
                        │                                ▼                                             ▼
                        │                      Stage 3A: SDPC Review                         Stage 3B: Dean Academics
                        │                                │                                             │
                        │                                └──────────────────────┬──────────────────────┘
                        │                                                       ▼
                        └───────────────────────────────────────────── Stage 4: Senate Review
                                                                                │
                                                                                ▼
                                                                       FINAL APPROVAL (CLOSED)
```

### Key Permission Policies:
- **HOD Download Prohibition:** Under no circumstances can an HOD download thesis documents. Only inline in-portal viewing is permitted.
- **Dynamic Recipient Resolution:** Forwarding recipients are computed server-side based on the scholar's department and institutional role assignments.
- **Multiple Roles:** Faculty members holding multiple roles (e.g. HOD and Supervisor) are scoped by the context of the thesis submission.

---

## 7. Testing & Quality Assurance

PRISMS features an automated integration and security test suite using Node.js native test runner and Supertest against a dedicated, isolated test database (`prisms_test`).

Run tests from `backend/`:
```bash
npm test
```

### Verified Test Results:
- **44/44 passing tests (0 failures)** covering:
  - Student draft, PDF signature verification, file size limits, IDOR protection
  - Supervisor queue, HOD dynamic recipient resolution, forwarding
  - DDPC observer access and restriction enforcement
  - In-portal inline viewing vs download authorization
  - **Strict HOD download denial enforcement (including multi-role contexts and `role=HOD` query parameter rejection)**
  - Unauthorized and unassigned faculty inline viewing rejection (403)
  - Safe 404 response on invalid or non-existent fileId
  - Parallel forwarding to both SDPC and Dean Academics
  - Return for revision with mandatory remarks, student feedback visibility
  - Multi-version resubmission (Version 1 -> Version 2)
  - Senate final approval and thesis closure
  - Formal rejection lifecycle
  - Supervisor scholar tracking dashboard and pagination
  - Single account multi-role validation
  - Audit log persistence

For detailed test documentation and suite breakdown, see [`docs/TESTING.md`](file:///home/ankurgupta/PRISMS/docs/TESTING.md).

---

## 8. Technical Documentation Directory

- [`docs/FRONTEND_FIGMA_MAPPING.md`](file:///home/ankurgupta/PRISMS/docs/FRONTEND_FIGMA_MAPPING.md): Figma node-to-route mapping, color and typography token definitions, and 27-route directory.
- [`docs/API.md`](file:///home/ankurgupta/PRISMS/docs/API.md): Comprehensive REST API endpoint reference with request/response examples.
- [`docs/THESIS_WORKFLOW.md`](file:///home/ankurgupta/PRISMS/docs/THESIS_WORKFLOW.md): Workflow engine specification, Mermaid diagrams, and state transitions.
- [`docs/AUTHORITY_ROUTING.md`](file:///home/ankurgupta/PRISMS/docs/AUTHORITY_ROUTING.md): Authority matrix, permission rules, and recipient resolution logic.
- [`docs/SECURITY.md`](file:///home/ankurgupta/PRISMS/docs/SECURITY.md): Security controls, IDOR prevention, private storage, and viewer limitations.
- [`docs/TESTING.md`](file:///home/ankurgupta/PRISMS/docs/TESTING.md): Testing guide and automated test report.

---

## 9. Development & System Credits

PRISMS was designed and engineered for the National Institute of Technology Hamirpur by:

- **Ankur Gupta** · [Portfolio](https://ankur-portfolio-topaz.vercel.app/) · Department of Computer Science & Engineering
- **Aditya Sharma** · [GitHub](https://github.com/itzzadi04) · Department of Computer Science & Engineering

---

## 10. Notes for Production Deployment

1. **Storage Provider:** While local private filesystem storage is configured for development, production can bind `THESIS_STORAGE_PATH` to a persistent private volume (e.g. NFS / private EBS) or an S3-compatible private bucket adapter.
2. **Reverse Proxy:** Terminate SSL/TLS at Nginx/Caddy and configure `client_max_body_size 25M` to accommodate the 20 MiB thesis limit.
3. **Malware Scanning:** An asynchronous ClamAV / VirusTotal scanner can poll `thesis_files` where `scan_status = 'PENDING'`, updating status to `'CLEAN'` or `'QUARANTINED'`.
4. **Secrets:** Supply strong random strings for `JWT_ACCESS_SECRET` and database credentials through container secrets or vault environments. Never commit `.env`.
