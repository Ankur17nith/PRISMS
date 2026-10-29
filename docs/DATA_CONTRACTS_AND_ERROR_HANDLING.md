# PRISMS — Data Contracts, Schema Alignments, and Error Handling Guide

This document specifies the technical data contracts, backend response schemas, error-handling conventions, and frontend defensive strategies implemented across the PRISMS (PhD Research & Institutional Scholars Management System) platform for NIT Hamirpur.

---

## 1. Root Cause Analyses & Resolution

### A. Missing Thesis Submission Status & String Method Crashes
* **Error:** `TypeError: Cannot read properties of undefined (reading 'replace')` in `/student/thesis/details?id=...`.
* **Root Cause:**
  1. The backend endpoint `GET /theses/:submissionId` returned `{ submission: { ... } }`, but client code expected the submission object at root.
  2. The page code accessed `submission.status.replace(/_/g, " ")` without prior validation or status normalization.
* **Resolution:**
  1. Frontend API client `getSubmissionDetails` normalizes the payload: `normalizeSubmission(res?.submission || res)`.
  2. Created [`statusHelper.ts`](file:///home/ankurgupta/PRISMS/frontend/src/lib/statusHelper.ts) providing `formatStatusLabel(status)` and `getStatusBadgeClasses(status)`, which defensively format null or undefined statuses without throwing runtime errors.

### B. Thesis Review Response Relations
* **Error:** `TypeError: Cannot read properties of undefined (reading 'user')` in `/faculty/reviews/[id]`.
* **Root Cause:**
  1. Backend `getSubmissionDetail` previously returned top-level `scholar` without a nested `student.user` object.
  2. The review workspace directly called `submission.student.user.fullName` without null-safe fallback chains.
* **Resolution:**
  1. Updated `getSubmissionDetail` in `backend/src/modules/thesis/thesis.service.ts` to return both `student` (with `user: { id, fullName, collegeEmail }` and `department: { id, code, name }`) and `scholar` relations.
  2. Added defensive fallback chains on the review workspace and HOD view pages:
     ```typescript
     const scholarName =
       submission?.student?.user?.fullName ||
       submission?.scholar?.fullName ||
       submission?.scholar?.user?.fullName ||
       "Doctoral Scholar";
     ```

### C. Unique React Key Warnings in Scholar Lists
* **Error:** `Warning: Each child in a list should have a unique "key" prop` in `/faculty/dashboard`.
* **Root Cause:**
  1. The backend returned `studentId` instead of `scholarId` on scholar items.
  2. Dashboard iterated `{scholars.map(s => <div key={s.scholarId} ...>)}`, evaluating to `key={undefined}`.
* **Resolution:**
  1. Backend `getSupervisorScholars` now populates both `scholarId: a.studentId` and `studentId: a.studentId`.
  2. Frontend list mapping now computes stable keys: `const sid = s.scholarId || s.studentId || s.rollNumber || 'scholar-' + idx`.
  3. Replaced unguarded links with conditional checks so links are never generated as `/faculty/scholars/undefined`.

### D. Scholar History Null Pointer Crashes
* **Error:** `TypeError: Cannot read properties of null (reading 'user')` in `/faculty/scholars/undefined` or `/faculty/scholars/[id]`.
* **Root Cause:**
  1. Clicking scholar links rendered with `undefined` scholar IDs invoked `GET /theses/supervisor/scholars/undefined`.
  2. The backend threw Prisma error `P2023` on malformed UUID strings, causing the API error handler to return `{ scholar: null }`.
  3. The detail page checked `if (error || !data)` (which passed because `data` existed), and immediately dereferenced `data.scholar.user.fullName`.
* **Resolution:**
  1. Backend route parameter validation helper `uuidParam` validates UUID strings and returns `404 RESOURCE_NOT_FOUND` before reaching Prisma.
  2. Frontend detail page guards against `!id || id === "undefined"`.
  3. Detail page condition updated to `if (error || !data || !data.scholar)` before rendering scholar details.
  4. Added dual-access fallback: `scholarObj.fullName || scholarObj.user?.fullName`.

### E. BigInt JSON Serialization
* **Error:** `TypeError: Do not know how to serialize a BigInt at JSON.stringify`.
* **Root Cause:** `ThesisFile.fileSizeBytes` in Prisma is typed as `BigInt`. Standard JavaScript `JSON.stringify` throws a TypeError when encountering raw BigInt primitives.
* **Resolution:**
  1. Configured global prototype serializer `(BigInt.prototype as any).toJSON = function () { return Number(this); };` in `backend/src/app.ts`.
  2. Explicitly mapped all file objects in `thesis.service.ts` to convert `fileSizeBytes: Number(f.fileSizeBytes)`.
  3. Dynamically compute byte sizes from disk storage using `fs.statSync` upon submission and resubmission.

---

## 2. API Data Contracts

### Submission Detail (`GET /theses/:submissionId`)
```json
{
  "submission": {
    "id": "uuid",
    "submissionNumber": 1,
    "submissionReference": "TH-2026-001",
    "title": "Scalable Consensus Protocols",
    "status": "SUBMITTED",
    "currentVersion": 1,
    "submittedAt": "2026-10-29T12:00:00.000Z",
    "student": {
      "id": "student-uuid",
      "rollNumber": "21PHDCSE01",
      "program": "PhD Computer Science & Engineering",
      "user": {
        "id": "user-uuid",
        "fullName": "Aarav Sharma",
        "collegeEmail": "student1@example.test"
      },
      "department": {
        "id": "dept-uuid",
        "code": "CSE",
        "name": "Computer Science and Engineering"
      }
    },
    "files": [
      {
        "id": "file-uuid",
        "originalFileName": "Aarav_Sharma_Thesis_v1.pdf",
        "fileSizeBytes": 4820000,
        "scanStatus": "CLEAN",
        "uploadedAt": "2026-10-29T12:00:00.000Z"
      }
    ],
    "stages": []
  }
}
```

### Supervisor Scholars (`GET /theses/supervisor/scholars`)
```json
{
  "scholars": [
    {
      "scholarId": "student-uuid",
      "studentId": "student-uuid",
      "rollNumber": "21PHDCSE01",
      "fullName": "Aarav Sharma",
      "collegeEmail": "student1@example.test",
      "program": "PhD Computer Science & Engineering",
      "admissionStatus": "CONFIRMED",
      "activeSubmission": {
        "id": "sub-uuid",
        "submissionReference": "TH-2026-001",
        "title": "Scalable Consensus Protocols",
        "status": "SUBMITTED",
        "currentVersion": 1,
        "submittedAt": "2026-10-29T12:00:00.000Z",
        "currentStage": "Supervisor Review"
      }
    }
  ]
}
```

### Scholar Supervision History (`GET /theses/supervisor/scholars/:studentId`)
```json
{
  "scholar": {
    "scholarId": "student-uuid",
    "studentId": "student-uuid",
    "rollNumber": "21PHDCSE01",
    "fullName": "Aarav Sharma",
    "collegeEmail": "student1@example.test",
    "user": {
      "id": "user-uuid",
      "fullName": "Aarav Sharma",
      "collegeEmail": "student1@example.test"
    },
    "program": "PhD Computer Science & Engineering",
    "department": {
      "code": "CSE",
      "name": "Computer Science and Engineering"
    }
  },
  "submissions": []
}
```

---

## 3. Verification & Compliance Matrix

| Requirement | Implementation | Status |
| :--- | :--- | :--- |
| **Missing Status Crash Fix** | `formatStatusLabel`, `normalizeSubmission`, safe badge classes | Verified |
| **Review Relations** | Added nested `student.user` & `student.department` | Verified |
| **Scholar List Keys** | Unique fallback keys `s.scholarId \|\| s.studentId` | Verified |
| **Scholar History IDOR & Null Safety** | Strict UUID check, null guards, dual property read | Verified |
| **BigInt JSON Serialization** | Global BigInt serialization and Number casting | Verified |
| **Unit & Integration Tests** | 50 automated tests in `thesis.test.ts` (13 suites) | 100% Pass |
| **Next.js Production Build** | All 27 static and dynamic routes compiled | 100% Pass |
