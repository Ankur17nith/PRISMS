# PRISMS REST API Documentation

This document describes all implemented REST API endpoints for the **PhD Research & Institutional Scholars Management System (PRISMS)** at NIT Hamirpur.

All endpoints adhere to REST conventions, JSON request/response formats (except binary PDF endpoints), and strict institutional role-based access control.

---

## 1. Authentication & Common Headers

### 1.1 Session & Token Authentication
PRISMS supports both browser cookies and authorization headers:

- **Cookie:** `access_token=<JWT>` (sent automatically by browsers when `credentials: "include"` is set)
- **Bearer Header:** `Authorization: Bearer <JWT>` (supported for API clients, command-line tools, and automated integration tests)

### 1.2 Role Context Header
Users holding multiple concurrent institutional roles (e.g. faculty who are simultaneously Research Supervisors and Department Heads) can pass the active role context:

- **Header:** `X-Active-Role: <ROLE_CODE>` (e.g. `HOD`, `SUPERVISOR`, `SDPC`, `DEAN`, `SENATE`)
- **Query Parameter:** `?role=<ROLE_CODE>` (used by direct browser navigations and PDF viewer elements)

> **Security Rule:** Any request specifying an active role context that the authenticated user does not actually possess is rejected with `403 Forbidden` (`ROLE_UNAUTHORIZED`).

### 1.3 Standard Error Format
All application errors follow a unified structure:

```json
{
  "error": {
    "message": "Human-readable error description.",
    "code": "ERROR_CODE",
    "issues": []
  }
}
```

---

## 2. Health & System Endpoints

### 2.1 Service Information
- **Method:** `GET`
- **Path:** `/`
- **Auth:** Public
- **Response `200 OK`:**
```json
{
  "name": "PRISMS API",
  "message": "PhD Research and Scholar Administration Portal API"
}
```

### 2.2 Database Health Check
- **Method:** `GET`
- **Path:** `/health/db`
- **Auth:** Public
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "database": "connected"
}
```
- **Error `503 Service Unavailable`:**
```json
{
  "status": "error",
  "database": "unavailable"
}
```

---

## 3. Authentication Endpoints (`/auth`)

### 3.1 Signup
- **Method:** `POST`
- **Path:** `/auth/signup`
- **Rate Limit:** 10 requests per 15 minutes
- **Request Body:**
```json
{
  "email": "scholar@nith.ac.in",
  "password": "SecurePassword123!",
  "fullName": "Aarav Sharma"
}
```
- **Response `202 Accepted`:**
```json
{
  "message": "If this email can be registered, a verification email has been sent."
}
```

### 3.2 Verify Email
- **Method:** `POST`
- **Path:** `/auth/verify-email`
- **Request Body:**
```json
{
  "token": "verification-token-string"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Email verified. You can now log in."
}
```

### 3.3 Resend Verification Email
- **Method:** `POST`
- **Path:** `/auth/resend-verification`
- **Request Body:**
```json
{
  "email": "scholar@nith.ac.in"
}
```
- **Response `202 Accepted`**

### 3.4 Login
- **Method:** `POST`
- **Path:** `/auth/login`
- **Rate Limit:** 20 requests per 15 minutes
- **Request Body:**
```json
{
  "email": "scholar@nith.ac.in",
  "password": "SecurePassword123!"
}
```
- **Response `200 OK`:** Sets `access_token` and `refresh_token` HTTP-only cookies.
```json
{
  "user": {
    "id": "e44d715b-24b5-4bfe-98d9-2ef531c3bf70",
    "email": "scholar@nith.ac.in",
    "fullName": "Aarav Sharma",
    "roles": ["STUDENT"],
    "department": {
      "id": "7649fbdb-8699-4d6d-8951-6893c8340d2b",
      "code": "CSE",
      "name": "Computer Science and Engineering"
    }
  }
}
```

### 3.5 Refresh Token
- **Method:** `POST`
- **Path:** `/auth/refresh`
- **Response `204 No Content`:** Issues new access token cookie.

### 3.6 Logout
- **Method:** `POST`
- **Path:** `/auth/logout`
- **Response `204 No Content`:** Clears auth cookies.

### 3.7 Logout All Sessions
- **Method:** `POST`
- **Path:** `/auth/logout-all`
- **Auth:** Required
- **Response `204 No Content`:** Revokes all active refresh tokens for the user account.

### 3.8 Forgot Password
- **Method:** `POST`
- **Path:** `/auth/forgot-password`
- **Request Body:** `{"email": "scholar@nith.ac.in"}`
- **Response `202 Accepted`**

### 3.9 Reset Password
- **Method:** `POST`
- **Path:** `/auth/reset-password`
- **Request Body:** `{"token": "reset-token", "password": "NewSecurePassword123!"}`
- **Response `200 OK`**

### 3.10 Current Authenticated User (`/auth/me`)
- **Method:** `GET`
- **Path:** `/auth/me`
- **Auth:** Required
- **Response `200 OK`:** Returns current user profile, active roles, and department.

---

## 4. Student Thesis Endpoints (`/theses`)

### 4.1 Get Thesis Draft & Scholar Context
- **Method:** `GET`
- **Path:** `/theses/draft`
- **Auth:** Required (`STUDENT`)
- **Response `200 OK`:**
```json
{
  "student": {
    "id": "e44d715b-24b5-4bfe-98d9-2ef531c3bf70",
    "rollNumber": "21PHDCSE01",
    "program": "PhD CSE",
    "department": {
      "id": "7649fbdb-8699-4d6d-8951-6893c8340d2b",
      "code": "CSE",
      "name": "Computer Science and Engineering"
    }
  },
  "supervisor": {
    "facultyId": "43026dd5-7f9a-4c28-bf3a-ce69493f6154",
    "userId": "d7e9b04c-3580-4da2-a42f-87a4192b1a5e",
    "name": "Dr. Rajesh Kumar",
    "email": "supervisor1@example.test"
  },
  "thesis": {
    "id": "b068779d-3f0e-4361-9c60-80a56feefaa2",
    "workingTitle": "Scalable Distributed Consensus in Heterogeneous Edge Networks",
    "abstract": "This dissertation presents novel consensus algorithms...",
    "researchArea": "Distributed Systems",
    "status": "IN_PROGRESS",
    "latestSubmission": null
  }
}
```

### 4.2 Save or Update Draft Metadata
- **Method:** `PUT`
- **Path:** `/theses/draft`
- **Auth:** Required (`STUDENT`)
- **Request Body:**
```json
{
  "workingTitle": "Scalable Distributed Consensus in Heterogeneous Edge Networks",
  "abstract": "Detailed abstract containing at least 20 characters...",
  "researchArea": "Distributed Systems"
}
```
- **Response `200 OK`:** Returns updated thesis draft record.

### 4.3 Upload Thesis PDF
- **Method:** `POST`
- **Path:** `/theses/upload`
- **Auth:** Required (`STUDENT`)
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (Binary PDF document)
- **Validation:** Enforces `%PDF-` header signature and configured size limit (`MAX_THESIS_FILE_SIZE_BYTES`, default 20 MiB).
- **Response `201 Created`:**
```json
{
  "file": {
    "storageKey": "9461f582-747f-47dc-9f06-fa70415aefc6.pdf",
    "originalFilename": "phd_thesis_final.pdf",
    "fileSizeBytes": "8303743",
    "sha256Checksum": "a1b2c3d4e5f6...",
    "mimeType": "application/pdf"
  }
}
```
- **Error Codes:**
  - `400 Bad Request` (`FILE_MISSING`, `INVALID_FILE_SIGNATURE`)
  - `413 Payload Too Large` (`FILE_TOO_LARGE`)

### 4.4 Submit Thesis Draft
- **Method:** `POST`
- **Path:** `/theses/submit`
- **Auth:** Required (`STUDENT`)
- **Request Body:**
```json
{
  "workingTitle": "Scalable Distributed Consensus in Heterogeneous Edge Networks",
  "storageKey": "9461f582-747f-47dc-9f06-fa70415aefc6.pdf",
  "originalFilename": "phd_thesis_final.pdf"
}
```
- **Response `201 Created`:**
```json
{
  "submissionId": "f7811db3-289b-4395-bf3b-a5d625527d2c",
  "submissionNumber": 1,
  "status": "SUBMITTED",
  "submittedAt": "2026-10-29T12:00:00.000Z",
  "fileId": "69179d72-9112-4d2b-9a41-2b0286dbdf5c",
  "currentStage": "Supervisor Review"
}
```
- **Errors:**
  - `409 Conflict` (`CONCURRENT_SUBMISSION_EXISTS`): Student already has an active submission undergoing review.

### 4.5 Resubmit Revised Thesis
- **Method:** `POST`
- **Path:** `/theses/resubmit`
- **Auth:** Required (`STUDENT`)
- **Request Body:**
```json
{
  "storageKey": "a909477e-1282-44f2-9512-b91c0ffdb724.pdf",
  "originalFilename": "revised_thesis_v2.pdf",
  "studentNote": "Addressed supervisor and committee notes on Section 3."
}
```
- **Response `201 Created`:** Increments `submissionNumber` (e.g. 2), attaches new PDF version, and re-routes to Supervisor Review. Previous versions are retained indefinitely.

### 4.6 List Student's Submissions & Released Feedback
- **Method:** `GET`
- **Path:** `/theses/my`
- **Auth:** Required (`STUDENT`)
- **Response `200 OK`:** Comprehensive history of all submission versions, stages, decisions, and released remarks.

---

## 5. Reviewer & Faculty Endpoints

### 5.1 Faculty Review Queue
- **Method:** `GET`
- **Path:** `/theses/queue`
- **Auth:** Required (Faculty with review roles)
- **Query Parameters:**
  - `role`: Filter by specific active role (`SUPERVISOR`, `HOD`, `SDPC`, `DEAN`, `SENATE`)
  - `stage`: Filter by stage code (`SUPERVISOR_REVIEW`, `HOD_REVIEW`, `SDPC_REVIEW`, `DEAN_REVIEW`, `SENATE_REVIEW`)
- **Response `200 OK`:**
```json
{
  "tasks": [
    {
      "assignmentId": "34185794-6b7f-4a37-b4d2-3c22ad64860b",
      "submissionId": "f7811db3-289b-4395-bf3b-a5d625527d2c",
      "submissionNumber": 1,
      "submittedAt": "2026-10-29T12:00:00.000Z",
      "workingTitle": "Scalable Distributed Consensus in Heterogeneous Edge Networks",
      "studentName": "Aarav Sharma",
      "rollNumber": "21PHDCSE01",
      "departmentCode": "CSE",
      "departmentName": "Computer Science and Engineering",
      "stageCode": "SUPERVISOR_REVIEW",
      "stageName": "Supervisor Review",
      "assignedRole": "SUPERVISOR",
      "status": "SUBMITTED"
    }
  ]
}
```

### 5.2 Get Submission Detail
- **Method:** `GET`
- **Path:** `/theses/:submissionId`
- **Auth:** Required (Scholar, Assigned Reviewer, Supervisor, DDPC, Admin)
- **Path Parameter:** `submissionId` (UUID)
- **Response `200 OK`:** Full submission object including scholar details, versioned files, stages, reviewer decisions, and timeline.

### 5.3 Authorized Forwarding Recipients
- **Method:** `GET`
- **Path:** `/theses/:submissionId/recipients` (or `/theses/:submissionId/eligible-recipients`)
- **Auth:** Required (Assigned Reviewer for the current pending stage)
- **Routing Rules:**
  - At `SUPERVISOR_REVIEW`: Returns active Head(s) of Department (HOD) for scholar's department (`single`).
  - At `HOD_REVIEW`: Returns Chairperson SDPC and Dean Academics (`single_or_both`).
  - At `SDPC_REVIEW` / `DEAN_REVIEW`: Returns Chairperson Senate (`single`).
- **Response `200 OK`:**
```json
{
  "currentStage": "Supervisor Review",
  "allowedSelection": "single",
  "recipients": [
    {
      "userId": "b5314051-ce03-4f51-b844-325bdfa9d821",
      "fullName": "Prof. Anil Verma",
      "email": "hod.cse@example.test",
      "roleCode": "HOD",
      "roleName": "Head of Department",
      "departmentName": "Computer Science and Engineering"
    }
  ]
}
```

### 5.4 Forward Submission
- **Method:** `POST`
- **Path:** `/theses/:submissionId/forward`
- **Auth:** Required (Assigned Reviewer)
- **Request Body:**
```json
{
  "summary": "Reviewed and verified. Recommended for institutional review.",
  "recipientUserIds": ["b5314051-ce03-4f51-b844-325bdfa9d821"]
}
```
- **Parallel Convergence Behavior:**
  - When HOD initiates parallel reviews (SDPC + Dean), both stage branches are marked `PENDING`.
  - When one branch is forwarded, the system checks whether any other parallel Stage 3 branch remains `PENDING`.
  - Senate Review is only created when all parallel branches have completed.
  - Forwarding at `SENATE_REVIEW` finalizes institutional approval (`status: APPROVED`).

### 5.5 Return for Revision
- **Method:** `POST`
- **Path:** `/theses/:submissionId/return`
- **Auth:** Required (Assigned Reviewer)
- **Request Body:**
```json
{
  "remarks": "Please provide additional convergence bounds in Section 4.2."
}
```
- **Behavior:** Marks submission `REVISION_REQUIRED`, cancels any pending parallel assignments, and unlocks student resubmission.

### 5.6 Reject Submission
- **Method:** `POST`
- **Path:** `/theses/:submissionId/reject`
- **Auth:** Required (Assigned Reviewer)
- **Request Body:**
```json
{
  "remarks": "Substantial uncited overlap detected exceeding institutional ethics standards."
}
```
- **Behavior:** Marks submission `REJECTED` and closes the doctoral thesis record.

---

## 6. Secure Document Streaming & Download

### 6.1 Inline Portal PDF Streaming
- **Method:** `GET`
- **Path:** `/theses/:submissionId/file/view`
- **Auth:** Required (`STUDENT`, `SUPERVISOR`, `HOD`, `DDPC`, `SDPC`, `DEAN_ACADEMICS`, `CHAIRPERSON_SENATE`, `ADMIN`)
- **Query Parameters:**
  - `fileId`: Specific version file UUID (defaults to the latest uploaded version)
  - `role`: Optional claimed active role context (validated against user's actual assigned roles)
- **Headers Returned:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="original_name.pdf"`
  - `Cache-Control: private, no-store, must-revalidate`
  - `X-Content-Type-Options: nosniff`
  - `Accept-Ranges: bytes`
- **Byte-Range Support (HTTP 206 Partial Content):**
  - Clients (e.g. PDF.js reader) stream document pages on demand by sending `Range: bytes=start-end`.
  - The server verifies range bounds and responds with `206 Partial Content`, `Content-Range: bytes start-end/totalSize`, and `Content-Length: chunkSize`.
  - Enables fluid in-browser reading of extensive 600+ page dissertations without memory exhaustion.
- **In-Portal Reader Integration (`ThesisBookReader`):**
  - **Offline WASM & Font Assets:** PDF.js runs with a locally hosted web worker (`/pdf.worker.min.mjs`), WebAssembly image decoders (`/wasm/jbig2.wasm`, `/wasm/openjpeg.wasm`), CMap glyph tables (`/cmaps/`), and Standard Fonts (`/standard_fonts/`), ensuring zero external CDN dependencies and complete offline decoding of JBIG2/monochrome scanned pages.
  - **Responsive Sizing & Auto-Fit:** Sizing uses a `ResizeObserver` on the viewer container. Available width (`containerWidth - 48px`) is dynamically matched against unscaled page dimensions (`page.getViewport({ scale: 1 }).width`) to compute fit scale without horizontal scroll overflow.
  - **Measurable Canvas Dimensions:** Explicit, non-zero measurable width and height are assigned to `<canvas>` elements before rendering. Pre-layout rendering calls with zero or negative container width are deferred until layout stabilizes.
  - **Negative Coordinate Clipping Prevention:** Inner canvas wrapper uses centered margin layout (`m-auto min-w-fit`) within an `overflow-auto flex flex-col` viewport. When zoomed in past container bounds, scroll origin remains strictly at `x = 0`, ensuring complete left margin visibility.
  - **Sequential Render Coordination:** Render operations are managed via sequence tokens (`renderSeqRef`) and cancellation promises (`renderTaskRef.cancel()`). Rapid page jumping or zoom changes abort in-flight rendering safely without canvas collision errors.

### 6.2 Thesis Document Download
- **Method:** `GET`
- **Path:** `/theses/:submissionId/file/download`
- **Auth:** Required
- **Query Parameters:**
  - `fileId`: Specific version file UUID (defaults to primary/latest)
  - `role`: Claimed active role context (checked against user profile and stage assignments)
- **Supervisor Download Permission:**
  - **Authorized Assigned Supervisors** possess full statutory authority to download thesis PDF documents for archival and in-depth offline annotation.
  - Prominent **Download PDF** action buttons are provided directly on the Supervisor Review Workspace (`/faculty/reviews/[id]`), the Dedicated Reader (`/faculty/thesis/reader/[id]`), and inside the `ThesisBookReader` component.
  - Initiates direct browser binary download with `Content-Disposition: attachment; filename="original_name.pdf"` and audit event recording (`thesis.file_downloaded`).
- **STATUTORY RESTRICTION RULE (HOD Download Prohibition):**
  - Under strict NIT Hamirpur academic statutes, **Head of Department (HOD) review access is strictly confined to secure in-portal reading**.
  - Any download request made while acting as HOD, holding HOD stage assignment, or claiming HOD role context is unequivocally blocked by the backend with **HTTP 403 Forbidden** (`DOWNLOAD_FORBIDDEN_FOR_ROLE`).
  - The frontend enforces this restriction by omitting the download button on HOD interfaces (`/faculty/reviews/[id]/hod`) and displaying a locked **View-Only Mode** institutional compliance badge.
- **Role Permission Matrix for Download:**

  | Role Context | In-Portal View (`/file/view`) | Direct Download (`/file/download`) | Enforcement Mechanism |
  |:---|:---:|:---:|:---|
  | Doctoral Student (Author) | Allowed | Allowed | Direct scholar access to own thesis |
  | Assigned Supervisor | Allowed | Allowed | Authorized evaluation & archive access |
  | Head of Department (HOD) | Allowed | **DENIED (403)** | Statutory restriction: `DOWNLOAD_FORBIDDEN_FOR_ROLE` |
  | DDPC / Departmental Observer | Allowed | Allowed | Departmental oversight permission |
  | SDPC / Dean Academics | Allowed | Allowed | Institutional authority permission |
  | Unassigned Faculty / Foreign User | **DENIED (403)** | **DENIED (403)** | Role isolation & IDOR prevention |

---

## 7. Supervisor Scholar Tracking Endpoints

### 7.1 List Supervised Scholars
- **Method:** `GET`
- **Path:** `/theses/supervisor/scholars`
- **Auth:** Required (`SUPERVISOR` or `HOD`)
- **Query Parameters:**
  - `status`: `current` | `completed` | `all` (default: `all`)
  - `search`: Filter by student roll number or name
  - `page`: Page index (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `role`: Optional active role context
- **Response `200 OK`:** Paginated scholars list with submission status, version, and supervisor dates.

### 7.2 Scholar History Details
- **Method:** `GET`
- **Path:** `/theses/supervisor/scholars/:studentId`
- **Auth:** Required (Must be assigned supervisor or departmental HOD)
- **Path Parameter:** `studentId` (Scholar UUID)
- **Response `200 OK`:** Complete scholar research dossier, all thesis versions, evaluation stages, decisions, and reviewer remarks.

---

## 8. Error Codes & HTTP Status Matrix

| HTTP Status | Error Code | Description |
|:---|:---|:---|
| `400 Bad Request` | `VALIDATION_ERROR` | Schema validation failed on input payload or query params. |
| `400 Bad Request` | `FILE_MISSING` | No file provided in multipart upload. |
| `400 Bad Request` | `INVALID_FILE_SIGNATURE` | File magic bytes do not match standard PDF `%PDF-`. |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or invalid authentication token/cookie. |
| `403 Forbidden` | `ROLE_UNAUTHORIZED` | User does not hold the active role claimed via header/query. |
| `403 Forbidden` | `DOWNLOAD_FORBIDDEN_FOR_ROLE` | Statutory restriction preventing HOD from downloading thesis files. |
| `403 Forbidden` | `FORBIDDEN` | Access denied to submission or resource. |
| `404 Not Found` | `RESOURCE_NOT_FOUND` | Invalid UUID or requested submission/file not found. |
| `409 Conflict` | `CONCURRENT_SUBMISSION_EXISTS` | Student already has an active submission in review. |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | Uploaded PDF exceeds configured maximum size limit. |
| `416 Range Not Satisfiable` | `RANGE_NOT_SATISFIABLE` | Requested byte range start/end exceeds total file size. |
| `429 Too Many Requests` | `RATE_LIMITED` | Endpoint rate limit exceeded. |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Unexpected server execution error. |
