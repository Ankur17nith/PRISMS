# PRISMS Thesis Submission & Approval API Documentation

This document describes all REST API endpoints for the Thesis Submission, Review, Document Streaming, and Scholar Tracking modules of PRISMS.

---

## 1. Authentication & Common Headers

All protected endpoints require an active session or JWT bearer token.

- **Cookie:** `access_token=<JWT>` (sent automatically by browser with `credentials: include`)
- **Bearer Header:** `Authorization: Bearer <JWT>` (supported for API clients and automated tests)
- **Error Response Shape:**
```json
{
  "error": {
    "message": "Human readable error description",
    "code": "ERROR_CODE",
    "issues": []
  }
}
```

---

## 2. Student Thesis Endpoints

### 2.1 Get Thesis Draft & Supervisor Context
- **Method:** `GET`
- **Path:** `/theses/draft`
- **Purpose:** Fetches current thesis draft metadata, active supervisor, and student details.
- **Auth:** Required (Student)
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

### 2.2 Create or Update Draft Metadata
- **Method:** `PUT`
- **Path:** `/theses/draft`
- **Purpose:** Saves or updates draft thesis title, abstract, and research area before formal submission.
- **Auth:** Required (Student)
- **Request Body (`application/json`):**
```json
{
  "workingTitle": "Scalable Distributed Consensus in Heterogeneous Edge Networks",
  "abstract": "Detailed abstract of the doctoral research...",
  "researchArea": "Distributed Systems"
}
```
- **Response `200 OK`:** Returns updated thesis draft.

### 2.3 Upload Thesis PDF
- **Method:** `POST`
- **Path:** `/theses/upload`
- **Content-Type:** `multipart/form-data`
- **Purpose:** Uploads thesis PDF into private storage. Validates `%PDF-` signature and enforces size limit (default 20 MiB).
- **Body:** `file` (Binary PDF)
- **Response `201 Created`:**
```json
{
  "file": {
    "storageKey": "9461f582-747f-47dc-9f06-fa70415aefc6.pdf",
    "originalFilename": "phd_thesis_final.pdf",
    "fileSizeBytes": "15420120",
    "sha256Checksum": "a1b2c3d4e5f60718293a4b5c6d7e8f90...",
    "mimeType": "application/pdf"
  }
}
```
- **Errors:**
  - `400 Bad Request` (`FILE_EMPTY`, `INVALID_FILE_SIGNATURE`): Not a valid PDF.
  - `413 Payload Too Large` (`FILE_TOO_LARGE`): Exceeds configured limit (e.g. 20 MiB).

### 2.4 Submit Thesis for Review
- **Method:** `POST`
- **Path:** `/theses/submit`
- **Purpose:** Initiates formal thesis submission lifecycle. Transitions workflow to Stage 1 (Supervisor Review).
- **Auth:** Required (Student)
- **Request Body (`application/json`):**
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
  - `409 Conflict` (`CONCURRENT_SUBMISSION_EXISTS`): Student already has an active submission in review.

### 2.5 Resubmit Revised Thesis
- **Method:** `POST`
- **Path:** `/theses/resubmit`
- **Purpose:** Submits a revised thesis version (e.g. Version 2) when the previous submission received `REVISION_REQUIRED`.
- **Auth:** Required (Student)
- **Request Body:**
```json
{
  "storageKey": "a909477e-1282-44f2-9512-b91c0ffdb724.pdf",
  "originalFilename": "revised_thesis_v2.pdf",
  "studentNote": "Incorporated statistical analysis in Chapter 4."
}
```
- **Response `201 Created`:** Increments `submissionNumber` (e.g. 2), creates new version and routes to Supervisor Review. Previous versions are retained indefinitely.

### 2.6 List Student's Submissions & Released Feedback
- **Method:** `GET`
- **Path:** `/theses/my`
- **Auth:** Required (Student)
- **Response `200 OK`:** Full list of all submission versions, stages, reviewer decisions, and released remarks.

---

## 3. Reviewer & Faculty Endpoints

### 3.1 Faculty Approval Queue
- **Method:** `GET`
- **Path:** `/theses/queue`
- **Query Parameters:** `role` (optional), `stage` (optional)
- **Purpose:** Returns all pending review tasks assigned to the authenticated faculty across all their active roles (and DDPC observer visibility).
- **Response `200 OK`:**
```json
{
  "tasks": [
    {
      "assignmentId": "34185794-6b7f-4a37-b4d2-3c22ad64860b",
      "submissionId": "f7811db3-289b-4395-bf3b-a5d625527d2c",
      "submissionNumber": 1,
      "submittedAt": "2026-10-29T12:00:00.000Z",
      "workingTitle": "Scalable Distributed Consensus...",
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

### 3.2 Submission Detail
- **Method:** `GET`
- **Path:** `/theses/:submissionId`
- **Auth:** Required (Author, Supervisor, DDPC, Assigned Reviewer, Admin)
- **Response `200 OK`:** Detailed submission overview with scholar info, file versions, completed stages, and timeline.

### 3.3 Authorized Forwarding Recipients
- **Method:** `GET`
- **Path:** `/theses/:submissionId/recipients`
- **Purpose:** Resolves dynamic, authorized recipients for the current stage from verified database relationships.
- **Stage Rules:**
  - At `SUPERVISOR_REVIEW`: Returns active HOD(s) of the scholar's department.
  - At `HOD_REVIEW`: Returns active Chairperson SDPC and Dean Academics (`single_or_both`).
  - At `SDPC_REVIEW`: Returns active Chairperson Senate (`single`).
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

### 3.4 Forward Submission
- **Method:** `POST`
- **Path:** `/theses/:submissionId/forward`
- **Auth:** Required (Current Assigned Reviewer)
- **Request Body:**
```json
{
  "summary": "Reviewed and approved for departmental evaluation.",
  "recipientUserIds": ["b5314051-ce03-4f51-b844-325bdfa9d821"]
}
```
- **Behavior:**
  - Completes current reviewer's assignment with `APPROVE`.
  - Transitions to next stage (or starts parallel stages if HOD selects both SDPC and Dean).
  - If executed at `SENATE_REVIEW`, finalizes approval (`SubmissionStatus = APPROVED`, `ThesisStatus = CLOSED`).

### 3.5 Return Submission for Mandatory Revision
- **Method:** `POST`
- **Path:** `/theses/:submissionId/return`
- **Auth:** Required (Current Assigned Reviewer)
- **Request Body:**
```json
{
  "remarks": "Chapter 4 requires detailed statistical power analysis and citation of recent 2025 benchmarks."
}
```
- **Behavior:**
  - Requires non-empty remarks (minimum 5 characters).
  - Sets submission status to `REVISION_REQUIRED`.
  - Cancels other pending parallel assignments.
  - Releases remarks to scholar for correction.

### 3.6 Reject Submission
- **Method:** `POST`
- **Path:** `/theses/:submissionId/reject`
- **Auth:** Required (Current Assigned Reviewer)
- **Request Body:**
```json
{
  "remarks": "Plagiarism detected in literature review section exceeding institutional threshold."
}
```
- **Behavior:**
  - Requires non-empty remarks.
  - Sets submission to `REJECTED` and thesis to `CLOSED`.

---

## 4. Secure Document Endpoints

### 4.1 Inline Portal PDF Viewing
- **Method:** `GET`
- **Path:** `/theses/:submissionId/file/view`
- **Auth:** Required (Scholar, Assigned Supervisor, DDPC, Assigned Reviewer, Admin)
- **Headers Returned:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="original_filename.pdf"`
  - `Cache-Control: private, no-store, must-revalidate`
  - `X-Content-Type-Options: nosniff`
- **Behavior:** Authenticated stream for embedded PDF viewer (PDF.js). No public storage URLs are exposed.

### 4.2 Document Download
- **Method:** `GET`
- **Path:** `/theses/:submissionId/file/download`
- **Auth:** Required
- **MANDATORY POLICY RULE:**
  - **HOD is strictly prohibited from downloading thesis documents.**
  - Requests by HOD are denied with `403 Forbidden` (`DOWNLOAD_FORBIDDEN_FOR_ROLE`).
  - Authorized roles: Scholar, Assigned Supervisor, DDPC, SDPC, Dean Academics, Chairperson Senate.
- **Headers Returned:**
  - `Content-Disposition: attachment; filename="original_filename.pdf"`

---

## 5. Supervisor Scholar Tracking Endpoints

### 5.1 List Supervised Scholars
- **Method:** `GET`
- **Path:** `/theses/supervisor/scholars`
- **Query Parameters:**
  - `status`: `current` | `completed` | `all` (default: `all`)
  - `search`: roll number or student name filter
  - `page`: positive integer (default: 1)
  - `limit`: items per page (default: 10, max: 100)
- **Auth:** Required (`SUPERVISOR`)
- **Response `200 OK`:** Paginated list with research details, supervision dates, latest submission number, status, and pending stage.

### 5.2 Scholar History Details
- **Method:** `GET`
- **Path:** `/theses/supervisor/scholars/:studentId`
- **Auth:** Required (Must be a current or former supervisor of this scholar)
- **Response `200 OK`:** Full historical dossier of all submission versions, file metadata, stage timeline, decisions, and reviewer remarks.
