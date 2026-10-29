# PRISMS — PhD Research & Institutional Scholars Management System

A robust, enterprise-grade full-stack platform for doctoral thesis submission, institutional workflow routing, multi-branch approval orchestration, immutable revision loops, and statutory document management at the **National Institute of Technology Hamirpur (NIT Hamirpur)**.

---

## 1. Project Overview & Architecture

PRISMS provides a secure, auditable, and multi-stage academic workflow engine:
1. **Student Submission:** Authenticated doctoral scholars manage dissertation metadata, upload thesis PDFs into private filesystem storage with SHA-256 integrity verification, and formally submit their thesis.
2. **Supervisor Review:** Assigned supervisors inspect thesis versions, read comments, and forward to authorized departmental HODs, or return for revisions.
3. **Departmental & HOD Review:** Head of Department reviews the thesis inline within the portal. **In accordance with NIT Hamirpur statutory ordinances, HOD review access is strictly view-only; file downloading is prohibited and enforced at the server level.**
4. **Parallel Institutional Review:** HOD can route submissions to Chairperson SDPC, Dean Academics, or both in parallel. When parallel branches are initiated, the engine synchronizes branch completion so that Senate Review is created only when all parallel reviews have finished.
5. **Final Senate Approval:** Chairperson Senate grants final institutional approval (`APPROVED`), transitioning the thesis to `CLOSED` and recording formal academic completion.
6. **Revision & History Tracking:** Returned theses allow scholar resubmission (creating immutable new versions `N+1`) while preserving all prior drafts, files, decisions, and remarks.
7. **Supervisor Scholar Dashboard:** Supervisors can track current and completed scholars, review timelines, and view full submission dossiers with pagination and search.

---

## 2. Technology Stack

### Backend
- **Runtime & Language:** Node.js (v22+), TypeScript (ES2022, NodeNext resolution, executed via `tsx`)
- **Web Framework:** Express 5.x
- **Database & ORM:** PostgreSQL 16+ with Prisma ORM 6.x
- **Authentication:** Argon2id password hashing, short-lived JWT access tokens, rotating opaque refresh tokens stored as SHA-256 hashes in `sessions` table
- **File Upload & Storage:** Multer memory storage, magic bytes signature validation (`%PDF-`), SHA-256 checksums, private filesystem storage outside web root
- **Document Streaming:** HTTP 206 Partial Content byte-range streaming (`Accept-Ranges: bytes`) for fast, progressive loading of multi-hundred page PDFs
- **Validation & Security:** Zod schemas, Helmet, CORS, Express-Rate-Limit, central error handler
- **Testing:** Node.js native test runner (`node:test`, `node:assert/strict`) with Supertest

### Frontend
- **Framework & Runtime:** Next.js 15.2.1 (App Router), React 19, TypeScript 5.8
- **Styling & Design System:** Tailwind CSS 3.4 with custom NIT Hamirpur color tokens (Surface `#f7f7f6`, Charcoal `#171717`, Brand Gold `#daa32f`, Primary Green `#16a34a`)
- **Document Viewer:** Custom `ThesisBookReader` backed by a local PDF.js 6.4 web worker (`/pdf.worker.min.mjs`), with render cancellation promises and statutory download controls
- **Visual Design Source:** Faithfully mapped from Figma file `SKPTGM8RvLhsCdfYotKCpb`
- **Architecture:** Responsive application shell, bilingual institutional branding (English & Hindi), dynamic multi-role context switcher, resilient API client

---

## 3. Repository Structure

```
PRISMS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Canonical PostgreSQL database schema
│   │   ├── migrations/             # Applied PostgreSQL migrations
│   │   └── seed.ts                 # Idempotent dev seed script (CSE department + accounts)
│   ├── src/
│   │   ├── app.ts                  # Express application setup & route mounting
│   │   ├── server.ts               # HTTP server listener and graceful shutdown
│   │   ├── config/
│   │   │   └── env.ts              # Validated environment variables (Zod)
│   │   ├── lib/
│   │   │   ├── prisma.ts           # PrismaClient singleton instance
│   │   │   ├── storage.ts          # Private storage, PDF magic bytes & byte-range streaming
│   │   │   ├── audit.ts            # Audit logging to audit_events table
│   │   │   ├── errors.ts           # AppError class
│   │   │   └── mailer.ts           # SMTP / console mail dispatcher
│   │   ├── middleware/
│   │   │   ├── auth.ts             # requireAuth, requireRole, AuthContext, role verification
│   │   │   ├── errorHandler.ts     # Centralized error handler
│   │   │   └── validate.ts         # Zod request validation middleware
│   │   ├── modules/
│   │   │   ├── auth/               # Signup, login, refresh, password reset
│   │   │   └── thesis/             # Submission, workflow routing, file view/download, tracking
│   │   └── generated/prisma/       # Generated Prisma Client (gitignored)
│   ├── storage/theses/             # Private thesis PDF storage (gitignored)
│   ├── .env.example                # Example environment configuration
│   └── package.json
├── frontend/                       # Next.js 15 App Router application
│   ├── public/
│   │   ├── assets/                 # Official NITH logo & SVG vector icon library
│   │   └── pdf.worker.min.mjs      # Bundled local PDF.js worker
│   ├── src/
│   │   ├── app/                    # 28 App Router routes (Student, Faculty, Public)
│   │   │   ├── student/            # Student Portal (dashboard, submit wizard, details, history...)
│   │   │   ├── faculty/            # Faculty Portal (dashboard, queue, reviews, hod, scholars...)
│   │   │   ├── login/              # Multi-role authentication & context switcher
│   │   │   └── page.tsx            # Institutional landing page
│   │   ├── components/             # Reusable UI components & ApplicationShell
│   │   └── lib/                    # api.ts (backend client), auth.tsx context, statusHelper.ts
│   ├── tailwind.config.ts          # Extracted Figma tokens
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md             # System architecture & component breakdown
│   ├── API.md                      # Comprehensive REST API reference & error codes
│   ├── openapi.yaml                # OpenAPI 3.1 REST API specification
│   ├── THESIS_WORKFLOW.md          # State machine, sequence, and parallel convergence
│   ├── DATABASE.md                 # PostgreSQL schema, Prisma models, indexes, and relations
│   ├── DEVELOPMENT.md              # Local development setup and troubleshooting
│   ├── TESTING.md                  # Automated test guide & verified execution report
│   ├── AUTHORITY_ROUTING.md        # Authority matrix & dynamic recipient resolution rules
│   ├── SECURITY.md                 # Security architecture, controls, and viewer limitations
│   └── FRONTEND_FIGMA_MAPPING.md   # Figma design-to-route mapping
├── compose.yaml                    # PostgreSQL service definition
└── README.md
```

---

## 4. Getting Started

### 4.1 Prerequisites
- **Node.js:** v22.x or later (`node -v` >= 22.0.0)
- **npm:** v10.x or later
- **PostgreSQL:** v16.x or later (running locally on port 5433 or via Docker)

### 4.2 Local Setup

1. **Install Dependencies:**
   ```bash
   npm --prefix backend install
   npm --prefix frontend install
   ```

2. **Configure Environment:**
   Create `backend/.env` (referencing `backend/.env.example`):
   ```ini
   PORT=4000
   FRONTEND_URL="http://localhost:3000"
   DATABASE_URL="postgresql://prisms_app:<db_password>@localhost:5433/prisms?schema=public&host=/tmp"
   DATABASE_URL_TEST="postgresql://prisms_app:<db_password>@localhost:5433/prisms_test?schema=public&host=/tmp"
   JWT_ACCESS_SECRET="<replace-with-a-secure-random-32-char-secret>"
   ACCESS_TOKEN_TTL_MINUTES=15
   REFRESH_TOKEN_TTL_DAYS=7
   MAX_THESIS_FILE_SIZE_BYTES=20971520
   THESIS_STORAGE_PATH="./storage/theses"
   ALLOWED_EMAIL_DOMAIN="nith.ac.in"
   NODE_ENV="development"
   ```

3. **Deploy Migrations & Seed:**
   ```bash
   npm --prefix backend run prisma:generate
   npm --prefix backend run prisma:migrate:deploy
   npm --prefix backend run seed
   ```

4. **Start Development Servers:**
   ```bash
   # Terminal 1: Backend API (http://localhost:4000)
   npm --prefix backend run dev

   # Terminal 2: Frontend (http://localhost:3000)
   npm --prefix frontend run dev
   ```

### 4.3 Environment Variables Reference

| Variable Name | Purpose / Description | Required | Default / Safe Example |
|:---|:---|:---|:---|
| `PORT` | HTTP port on which the Express backend listens. | Optional | `4000` |
| `FRONTEND_URL` | Base URL of the Next.js frontend for CORS headers and cookie credentials. | Optional | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string including credentials, port, and database name. | **Required** | `postgresql://prisms_app:<db_password>@localhost:5433/prisms?schema=public` |
| `DATABASE_URL_TEST` | PostgreSQL connection string for dedicated test database (`prisms_test`). | **Required for tests** | `postgresql://prisms_app:<db_password>@localhost:5433/prisms_test?schema=public` |
| `JWT_ACCESS_SECRET` | Cryptographic secret for signing and verifying HMAC-SHA256 JWT access tokens (min 32 chars). | **Required** | `<min-32-char-cryptographic-random-secret>` |
| `ACCESS_TOKEN_TTL_MINUTES` | Lifetime of short-lived stateless JWT access tokens in minutes. | Optional | `15` |
| `REFRESH_TOKEN_TTL_DAYS` | Validity period of rotating session refresh tokens in days. | Optional | `7` |
| `MAX_THESIS_FILE_SIZE_BYTES` | Maximum allowable PDF upload size in bytes (enforced in Multer and file scanner). | Optional | `20971520` (20 MiB) |
| `THESIS_STORAGE_PATH` | Host filesystem directory path for storing dissertation PDF files outside the web root. | Optional | `./storage/theses` |
| `ALLOWED_EMAIL_DOMAIN` | Institutional email domain filter for scholar self-registration. | Optional | `nith.ac.in` (allows all in dev when unset) |
| `SMTP_HOST` | Hostname of institutional SMTP relay server. | Optional | Unset (logs email notifications to console in dev) |
| `SMTP_PORT` | Port for SMTP relay server connection. | Optional | `2525` |
| `SMTP_USER` | Username for SMTP server authentication. | Optional | Unset |
| `SMTP_PASS` | Password for SMTP server authentication. | Optional | Unset |
| `MAIL_FROM` | RFC 5322 display name and address for system email notifications. | Optional | `PRISMS <no-reply@prisms.local>` |
| `NODE_ENV` | Application runtime environment (`development`, `test`, `production`). | Optional | `development` |

> [!NOTE]
> **Refresh Token Architecture:**
> PRISMS intentionally does not utilize a `JWT_REFRESH_SECRET`. Instead of stateless JWTs, refresh tokens are generated as 32-byte cryptographically secure random values (`crypto.randomBytes(32).toString('hex')`). Only the SHA-256 digest of the token is persisted in the PostgreSQL `sessions` table alongside expiration timestamps, user-agent details, and client IP metadata. This architecture guarantees immediate server-side revocation on logout, role changes, or session rotation.

> [!IMPORTANT]
> **Security Notice & Git History Advisory:**
> Removing credentials, passwords, and secrets from tracked documentation and sample files only sanitizes current and future revisions; it does not expunge them from prior Git commit history. If sensitive production secrets or database credentials were committed previously, they must be treated as compromised and rotated immediately within your database server, identity provider, and hosting infrastructure. Never track active `.env` or `.env.local` files in version control.

---

## 5. Seed Accounts

Default development accounts configured with password `Password123!`:

| Portal / Role | Email | Name | Scope / Department |
|:---|:---|:---|:---|
| **Scholar 1** | `aarav.sharma@example.test` | Aarav Sharma | PhD Scholar (`21PHDCSE01`) |
| **Scholar 2** | `sneha.patel@example.test` | Sneha Patel | PhD Scholar (`21PHDCSE02`) |
| **Supervisor 1** | `supervisor1@example.test`| Dr. Rajesh Kumar | CSE Faculty |
| **HOD** | `hod.cse@example.test` | Prof. Anil Verma | Head, Dept. of CSE *(Strictly View-Only)* |
| **Chairperson SDPC** | `sdpc@example.test` | Dr. Vikram Malhotra | Senate Degree Review |
| **Dean Academics** | `dean.acad@example.test` | Prof. Sanjay Gupta | Office of Dean (Academic) |
| **Chairperson Senate**| `senate.chair@example.test`| Director | Senate Final Approval Authority |
| **Admin** | `admin@example.test` | Administrator | Institutional IT |

---

## 6. Testing & Quality Verification

Run the automated integration and security test suite from `backend/`:
```bash
npm --prefix backend test
```

### Verified Test Results:
- **75/75 passing tests (0 failures)** across 18 suites:
  - Role Normalization: Deduplication of role aliases (`SDPC`, `DEAN`, `CHAIRMAN`)
  - Reader Concurrency: Canvas render cancellation and suppression of abort exceptions
  - Layout & Sizing: PDF viewport sizing, non-zero canvas geometry, and observer debouncing
  - Suite A: Student Submission Lifecycle & File Validation
  - Suite B: Supervisor Review, Recipient Selection & Forwarding
  - Suite C: DDPC Observer Permissions
  - Suite D: HOD Review, Recipient Selection & Download Denial
  - Suite E: Return for Revision, Student Feedback & Resubmission
  - Suite F: Full Chain to Final Approval (Supervisor -> HOD -> SDPC -> Senate)
  - Suite G: Supervisor Scholar Tracking Dashboard
  - Suite H: Formal Rejection Lifecycle
  - Suite I: File Size Limits & Edge Cases (20 MiB limit)
  - Suite J: Single Account Holding Multiple Roles
  - Suite K: Comprehensive Audit Trail Verification
  - Suite L: Frontend Integration & Data Contract Regressions
  - Suite M: Thesis Routing, Authority Assignments & Reader Permissions
  - Suite N: Regressions: Parallel Convergence, Role Verification, Byte-Range & Deduplication

---

## 7. Documentation Directory

- [`docs/ARCHITECTURE.md`](file:///home/ankurgupta/PRISMS/docs/ARCHITECTURE.md): System architecture, module decomposition, and security boundaries.
- [`docs/API.md`](file:///home/ankurgupta/PRISMS/docs/API.md): Comprehensive REST API endpoint reference and error code matrix.
- [`docs/openapi.yaml`](file:///home/ankurgupta/PRISMS/docs/openapi.yaml): Full OpenAPI 3.1 specification for API consumers and tooling.
- [`docs/THESIS_WORKFLOW.md`](file:///home/ankurgupta/PRISMS/docs/THESIS_WORKFLOW.md): Workflow engine specification, sequence diagrams, and parallel convergence logic.
- [`docs/DATABASE.md`](file:///home/ankurgupta/PRISMS/docs/DATABASE.md): PostgreSQL database schema, Prisma models, indexes, and relations.
- [`docs/DEVELOPMENT.md`](file:///home/ankurgupta/PRISMS/docs/DEVELOPMENT.md): Local development setup, environment configuration, and troubleshooting.
- [`docs/TESTING.md`](file:///home/ankurgupta/PRISMS/docs/TESTING.md): Testing guide and automated test report.
- [`docs/AUTHORITY_ROUTING.md`](file:///home/ankurgupta/PRISMS/docs/AUTHORITY_ROUTING.md): Authority matrix, permission rules, and dynamic recipient resolution logic.
- [`docs/SECURITY.md`](file:///home/ankurgupta/PRISMS/docs/SECURITY.md): Security controls, IDOR prevention, private storage, and viewer limitations.
- [`docs/FRONTEND_FIGMA_MAPPING.md`](file:///home/ankurgupta/PRISMS/docs/FRONTEND_FIGMA_MAPPING.md): Figma node-to-route mapping and design token directory.

---

## 8. Development & System Credits

PRISMS was designed and engineered for the National Institute of Technology Hamirpur by:

- **Ankur Gupta** · [Portfolio](https://ankur-portfolio-topaz.vercel.app/) · Department of Computer Science & Engineering
- **Aditya Sharma** · [GitHub](https://github.com/itzzadi04) · Department of Computer Science & Engineering
