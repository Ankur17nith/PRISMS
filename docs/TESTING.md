# PRISMS Automated Testing Guide & Test Report

This document details the testing architecture, database isolation, execution procedures, and actual verified test results for PRISMS.

---

## 1. Testing Architecture & Framework

PRISMS uses Node.js v22's native test runner (`node:test`, `node:assert/strict`) powered by `tsx` (TypeScript execute) and `supertest` for end-to-end HTTP integration tests.

### Key Advantages:
- **Zero Heavy Harness Dependencies:** Native to Node.js v22, avoiding jest/babel transpile overhead.
- **Full Type-Safety:** Test files are native TypeScript (`.test.ts`).
- **Complete HTTP & Database Pipeline:** Tests hit the real Express application pipeline (`app`), authenticating via cryptographic JWT tokens and running real PostgreSQL transactions.
- **Strict Role Simulation:** Verifies role-based access control, active role verification (`X-Active-Role`), and statutory HOD download restrictions directly over HTTP.

---

## 2. Test Environment Setup

### 2.1 Prerequisites
- Node.js >= 22.x
- PostgreSQL >= 16 (running on port 5433 or configured via `DATABASE_URL`)

### 2.2 Environment Variables for Testing
Ensure `backend/.env` contains the dedicated test database configuration:
```ini
DATABASE_URL="postgresql://prisms_app:<db_password>@localhost:5433/prisms?schema=public&host=/tmp"
DATABASE_URL_TEST="postgresql://prisms_app:<db_password>@localhost:5433/prisms_test?schema=public&host=/tmp"
JWT_ACCESS_SECRET="your-32-character-secret-key-for-access-jwt-token"
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=7
MAX_THESIS_FILE_SIZE_BYTES=20971520
THESIS_STORAGE_PATH="./storage/theses"
NODE_ENV="development"
```

> [!NOTE]
> The test runner automatically detects `NODE_ENV=test` and switches Prisma client connections to `DATABASE_URL_TEST` (`prisms_test`). The test suite includes pre-flight connectivity checks that emit clear diagnostics if PostgreSQL is offline or misconfigured, rather than masking failures.

### 2.3 Dedicated Test Database Setup & Seeding
Before running tests, ensure the test database is provisioned, migrated, and seeded:
```bash
# Provision prisms_test and deploy migrations
createdb -h 127.0.0.1 -p 5433 -U prisms_app prisms_test
DATABASE_URL="postgresql://prisms_app:<db_password>@localhost:5433/prisms_test?schema=public&host=/tmp" npx prisma migrate deploy
DATABASE_URL="postgresql://prisms_app:<db_password>@localhost:5433/prisms_test?schema=public&host=/tmp" npm run seed
```

---

## 3. How to Run Tests

From the `backend/` directory:

```bash
# Run the complete test suite (executes against prisms_test)
npm test

# Run with verbose subtest reporting
NODE_ENV=test npx tsx --test "src/**/*.test.ts"
```

---

## 4. Test Suite Coverage Summary

The test suite in [`src/modules/thesis/thesis.test.ts`](file:///home/ankurgupta/PRISMS/backend/src/modules/thesis/thesis.test.ts) and adjacent test suites cover 70 comprehensive integration tests across 17 suites:

| Suite | Category | Scenarios Covered | Status |
|:---|:---|:---|:---:|
| **Role Norm** | **Role Normalization** | Alias deduplication (`SDPC`, `DEAN`, `CHAIRMAN`), multi-role preservation. | **PASSED** |
| **Reader** | **Canvas Concurrency** | Single page render, rapid jump cancellation, suppression of cancellation exceptions. | **PASSED** |
| **A** | **Student Submission** | Unauthenticated rejection, draft metadata, empty file, non-PDF header signature rejection, authentic PDF upload & checksum, formal submission, concurrent submission prevention, IDOR protection. | **PASSED** |
| **B** | **Supervisor Review** | Queue visibility, unassigned supervisor exclusion, submission inspection, dynamic HOD recipient resolution, forged recipient rejection, forwarding to HOD. | **PASSED** |
| **C** | **DDPC Observer** | Departmental observer view access, transition execution rejection. | **PASSED** |
| **D** | **HOD Review & Security** | In-portal inline viewing, **mandatory HOD download prohibition**, assigned supervisor download permission, unauthorized faculty viewing denial, safe 404 for invalid fileId, SDPC/Dean recipient resolution, parallel forwarding. | **PASSED** |
| **E** | **Return & Revision** | Return with mandatory remarks, whitespace-only remark rejection, student feedback retrieval, revised PDF upload, version 2 resubmission. | **PASSED** |
| **F** | **Full Chain to Senate** | Version 2 approval through Supervisor -> HOD -> SDPC -> Senate final approval, thesis closure. | **PASSED** |
| **G** | **Scholar Tracking** | Paginated scholar listing, full version history inspection, unauthorized supervisor exclusion. | **PASSED** |
| **H** | **Formal Rejection** | Student 2 initial submission, empty remarks rejection, supervisor rejection with remarks, resubmission blocking on rejected thesis. | **PASSED** |
| **I** | **Upload Limits** | Rejection of files exceeding 20 MiB with HTTP 413. | **PASSED** |
| **J** | **Multi-Role Faculty** | Aggregated roles per account, HOD download prohibition enforcement in multi-role context, explicit `role=HOD` query parameter rejection. | **PASSED** |
| **K** | **Audit Trail** | Verification of persisted `AuditEvent` records for all lifecycle events and denied downloads. | **PASSED** |
| **L** | **Frontend Data Contracts** | Safe 404 for undefined parameters, serialized file sizes, scholar roster data contracts. | **PASSED** |
| **M** | **Routing & Permissions** | Route aliases (`/recipients` & `/eligible-recipients`), reviewer access locks, student downloads. | **PASSED** |
| **N** | **Regressions & Concurrency**| Strictly deduplicated HOD recipients across aliases, byte-range HTTP 206 streaming for PDF viewer, role-based download denial for spoofed roles, parallel SDPC/Dean branch convergence and Senate creation. | **PASSED** |

### Verified Test Run Result:
```text
✔ PRISMS Thesis Workflow & Security Integration Suite
ℹ tests 70
ℹ suites 17
ℹ pass 70
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
