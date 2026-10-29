# PRISMS System Architecture

This document describes the high-level architecture, module decomposition, security boundary, and data flow of the **PhD Research & Institutional Scholars Management System (PRISMS)** for NIT Hamirpur.

---

## 1. High-Level Architecture Overview

PRISMS is structured as a decoupled full-stack architecture comprising an Express TypeScript backend API, a Next.js 15 frontend application, and a PostgreSQL relational database managed via Prisma ORM.

```mermaid
flowchart TB
    subgraph Client["Client Tier (Browser)"]
        Landing["Landing & Info Pages"]
        StudentUI["Student Portal (Next.js 15 App Router)"]
        FacultyUI["Faculty Portal (Multi-Role Dashboard & Queue)"]
        PDFReader["ThesisBookReader (PDF.js Worker)"]
    end

    subgraph Gateway["API & Security Boundary"]
        ReverseProxy["Express Application (Port 5000)"]
        CorsHelmet["CORS / Helmet / CookieParser"]
        AuthMiddleware["requireAuth / requireRole / X-Active-Role"]
        RateLimiter["express-rate-limit"]
    end

    subgraph Services["Core Application Modules"]
        AuthService["Auth Module (Argon2id, JWT, Sessions)"]
        ThesisService["Thesis Lifecycle & State Machine"]
        StreamService["Secure Document Stream & Byte-Range Handler"]
        StorageService["Private Storage (Magic Bytes & Checksums)"]
        AuditService["Audit Logger (audit_events)"]
    end

    subgraph Data["Persistence Tier"]
        PostgreSQL[("PostgreSQL Database (Prisma ORM)")]
        PrivateDisk[("Private Storage /storage/theses/")]
    end

    Client -->|HTTP / JSON / Cookies| Gateway
    Gateway --> Services
    Services --> PostgreSQL
    StreamService --> PrivateDisk
    StorageService --> PrivateDisk
```

---

## 2. Frontend Architecture (Next.js 15 App Router)

The frontend is built on **Next.js 15.2.1** utilizing React 19, TypeScript 5.8, and Tailwind CSS 3.4.

### 2.1 Route Decomposition
The application comprises 28 statically optimized and dynamic routes:
- **Public & Marketing:** `/`, `/about`, `/contact`, `/guidelines`, `/workflow`, `/login`
- **Student Portal:**
  - `/student/dashboard`: Current academic status, active thesis version, progress tracker
  - `/student/thesis/submit`: Multi-step submission wizard with pre-validation and PDF upload
  - `/student/thesis/details`: Comprehensive thesis record, review timeline, and remarks
  - `/student/thesis/history`: Immutable archive of all submission versions
  - `/student/thesis/reader`: Embedded in-portal PDF reader
- **Faculty Portal:**
  - `/faculty/dashboard`: Overview of tasks, scholars, and quick links
  - `/faculty/queue`: Institutional review tasks filtered by assigned role
  - `/faculty/reviews/[id]`: Review workspace for Supervisor, DDPC, SDPC, Dean, Senate
  - `/faculty/reviews/[id]/hod`: Dedicated HOD evaluation workspace with parallel forwarding
  - `/faculty/thesis/reader/[id]`: Secure inline dissertation reader
  - `/faculty/scholars`: Supervised scholar roster with search and pagination
  - `/faculty/scholars/[id]`: Historical scholar dossier and submission versions

### 2.2 Reusable Components & ApplicationShell
All portal pages inherit from [`ApplicationShell`](file:///home/ankurgupta/PRISMS/frontend/src/components/ApplicationShell.tsx), providing:
- Institutional bilingual header (English / Hindi) with official NITH crest.
- Role context indicator and switcher for multi-role faculty.
- Navigation links adapted to active role (Student vs. Faculty).
- Clean institutional footer adhering to the approved reference layout.

### 2.3 Secure In-Portal Document Reader ([`ThesisBookReader`](file:///home/ankurgupta/PRISMS/frontend/src/components/ThesisBookReader.tsx))
- Integrated with local PDF.js worker (`/pdf.worker.min.mjs`) to avoid CDN dependencies.
- Handles concurrent page render cancellation to prevent canvas collision errors.
- Communicates with `/theses/:id/file/view` using HTTP `Range: bytes=start-end` requests for fast, progressive loading of large dissertations (e.g. 600+ pages).
- Enforces statutory download restrictions directly in the UI based on server-provided permissions (`canDownload = false`).

---

## 3. Backend Architecture (Express & TypeScript)

The backend is built with **Node.js (v22+)**, **Express 5**, and **TypeScript** configured with NodeNext ESM module resolution.

### 3.1 Core Modules
- **`modules/auth`:** User registration, email verification, session rotation, password reset, and JWT cookie management.
- **`modules/thesis`:** Thesis drafting, PDF upload integrity checks, multi-stage workflow engine, parallel review branching, document streaming, and scholar tracking.
- **`lib/storage.ts`:** Private filesystem storage outside the web root. Validates `%PDF-` file signatures, enforces maximum file sizes, and provides range-capable read streams.
- **`lib/audit.ts`:** Structured audit event recording for compliance.
- **`middleware/`:** Authentication, role enforcement, active role verification, input validation (Zod), and centralized error handling.

---

## 4. Security Architecture & Statutory Constraints

### 4.1 Authentication & Multi-Role Authorization
- **Credentials:** Passwords hashed with Argon2id.
- **Session Tokens:** Short-lived JWT access tokens stored in HTTP-only, `SameSite=Lax` cookies (with bearer fallback for API clients).
- **Session Revocation:** Refresh tokens stored as SHA-256 hashes in `sessions` table, enabling instantaneous single-session or all-session revocation (`/auth/logout-all`).
- **Role Context Enforcement:** Faculty holding multiple positions (e.g. Supervisor and HOD) can provide `X-Active-Role` or `?role=`. The server cryptographically validates that the user actually holds the claimed role, rejecting spoofed contexts with `403 ROLE_UNAUTHORIZED`.

### 4.2 Mandatory Statutory HOD Download Restriction
In strict compliance with NIT Hamirpur doctoral ordinances:
- **Head of Department (HOD) access is confined exclusively to in-portal inline viewing.**
- At no point during the HOD evaluation stage may a thesis file be downloaded, saved locally, or exported.
- The backend enforces this strictly at `/theses/:submissionId/file/download`:
  - When the user's active role is `HOD`, the server immediately responds with **`403 Forbidden` (`DOWNLOAD_FORBIDDEN_FOR_ROLE`)**.
  - All download attempts are logged to `audit_events`.
- In the frontend, download controls are replaced with an explicit statutory view-only notice.

### 4.3 Secure PDF Streaming & Storage Isolation
- Thesis files are never saved in public or static directories. They are stored in `backend/storage/theses/` using UUID-based filenames (`<storageKey>.pdf`).
- Inline viewing via `/theses/:id/file/view` streams data directly from disk to the client with:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="..."`
  - `Cache-Control: private, no-store, must-revalidate`
  - `Accept-Ranges: bytes` (supporting HTTP 206 Partial Content)
- Range requests enable browsers and PDF.js to stream specific byte segments without holding massive multi-megabyte PDFs in server memory.

---

## 5. Parallel Review Convergence Architecture

When a submission is evaluated by the Head of Department (Stage 2), the HOD may forward the submission to:
1. **Chairperson SDPC** (Single branch)
2. **Dean Academics** (Single branch)
3. **Both SDPC and Dean in Parallel**

```mermaid
sequenceDiagram
    autonumber
    actor HOD as Head of Department
    participant API as PRISMS Backend
    participant DB as PostgreSQL
    actor SDPC as Chairperson SDPC
    actor Dean as Dean Academics
    actor Senate as Chairperson Senate

    HOD->>API: POST /theses/:id/forward [SDPC + Dean]
    API->>DB: Complete Stage 2 (HOD_REVIEW)
    API->>DB: Create Stage 3A (SDPC_REVIEW) & Stage 3B (DEAN_REVIEW)
    Note over API,DB: Both branches active in parallel

    par Parallel Review
        SDPC->>API: POST /theses/:id/forward
        API->>DB: Complete Stage 3A (SDPC_REVIEW)
        API->>DB: Check other Stage 3 branches
        Note over API: Stage 3B still PENDING -> DO NOT create Senate Review yet
    and
        Dean->>API: POST /theses/:id/forward
        API->>DB: Complete Stage 3B (DEAN_REVIEW)
        API->>DB: Check other Stage 3 branches
        Note over API: All Stage 3 branches COMPLETED -> Create Stage 4 (SENATE_REVIEW)
    end

    Senate->>API: POST /theses/:id/forward (Final Approval)
    API->>DB: Complete Stage 4 (SENATE_REVIEW)
    API->>DB: Update ThesisSubmission status = APPROVED
    API->>DB: Update Thesis status = CLOSED
```

If either parallel reviewer returns the thesis for revision or rejects it, all parallel branches are cancelled, and the thesis transitions immediately to `REVISION_REQUIRED` or `REJECTED`.
