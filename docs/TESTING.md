# PRISMS Automated Testing Guide & Test Report

This document details the testing architecture, database isolation, execution procedures, and actual verified test results for PRISMS.

---

## 1. Testing Architecture & Framework

PRISMS uses Node.js v22's native test runner (`node:test`, `node:assert/strict`) powered by `tsx` (TypeScript execute) and `supertest` for end-to-end HTTP integration tests.

### Key Advantages:
- **Zero Heavy Harness Dependencies:** Native to Node.js v22, avoiding jest/babel transpile overhead.
- **Full Type-Safety:** Test files are native TypeScript (`.test.ts`).
- **Complete HTTP & Database Pipeline:** Tests hit the real Express application pipeline (`app`), authenticating via cryptographic JWT tokens and running real PostgreSQL transactions.

---

## 2. Test Environment Setup

### 2.1 Prerequisites
- Node.js >= 22.x
- PostgreSQL >= 16 (running on port 5433 or configured via `DATABASE_URL`)

### 2.2 Environment Variables for Testing
Ensure `backend/.env` contains:
```ini
DATABASE_URL="postgresql://prisms_app:password@localhost:5433/prisms?schema=public"
JWT_ACCESS_SECRET="prisms-development-jwt-access-secret-32-chars-minimum-key"
MAX_THESIS_FILE_SIZE_BYTES=20971520
THESIS_STORAGE_PATH="./storage/theses"
NODE_ENV="development"
```

### 2.3 Database Migration & Seeding
Before running tests, ensure migrations and seed data are applied:
```bash
npm run build
npx prisma migrate deploy
npm run seed
```

---

## 3. How to Run Tests

From the `backend/` directory:

```bash
# Run the complete test suite
npm test

# Run with verbose subtest reporting
npx tsx --test "src/**/*.test.ts"
```

---

## 4. Test Suite Coverage Summary

The test suite in [`src/modules/thesis/thesis.test.ts`](file:///home/ankurgupta/PRISMS/backend/src/modules/thesis/thesis.test.ts) covers 41 comprehensive integration tests across 12 suites:

| Suite | Category | Scenarios Covered | Status |
|:---|:---|:---|:---:|
| **A** | **Student Submission** | Unauthenticated rejection, draft metadata, empty file, non-PDF header signature rejection, authentic PDF upload & checksum, formal submission, concurrent submission prevention, IDOR protection. | **PASSED (9/9)** |
| **B** | **Supervisor Review** | Queue visibility, unassigned supervisor exclusion, submission inspection, dynamic HOD recipient resolution, forged recipient rejection, forwarding to HOD. | **PASSED (6/6)** |
| **C** | **DDPC Observer** | Departmental observer view access, transition execution rejection. | **PASSED (2/2)** |
| **D** | **HOD Review & Security** | In-portal inline viewing, **mandatory HOD download prohibition**, assigned supervisor download permission, SDPC/Dean recipient resolution, parallel forwarding. | **PASSED (5/5)** |
| **E** | **Return & Revision** | Return with mandatory remarks, whitespace-only remark rejection, student feedback retrieval, revised PDF upload, version 2 resubmission. | **PASSED (4/4)** |
| **F** | **Full Chain to Senate** | Version 2 approval through Supervisor -> HOD -> SDPC -> Senate final approval, thesis closure. | **PASSED (4/4)** |
| **G** | **Scholar Tracking** | Paginated scholar listing, full version history inspection, unauthorized supervisor exclusion. | **PASSED (3/3)** |
| **H** | **Formal Rejection** | Student 2 initial submission, empty remarks rejection, supervisor rejection with remarks, resubmission blocking on rejected thesis. | **PASSED (4/4)** |
| **I** | **Upload Limits** | Rejection of files exceeding 20 MiB with HTTP 413. | **PASSED (1/1)** |
| **J** | **Multi-Role Faculty** | Aggregated roles per account, HOD download prohibition enforcement in multi-role context. | **PASSED (2/2)** |
| **K** | **Audit Trail** | Verification of persisted `AuditEvent` records for all lifecycle events and denied downloads. | **PASSED (1/1)** |

### Verified Test Run Result:
```text
✔ PRISMS Thesis Workflow & Security Integration Suite
ℹ tests 41
ℹ suites 12
ℹ pass 41
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1378.06
```
