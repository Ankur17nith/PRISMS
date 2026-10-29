# PRISMS Security Architecture & Policy

This document outlines the security controls, authorization layers, document protections, and audit controls implemented in PRISMS.

---

## 1. Authentication Layer

- **JWT Tokens:** Signed using HMAC-SHA256 with `JWT_ACCESS_SECRET` (minimum 32 characters validated at startup).
- **Short-Lived Access Tokens:** Expire in 15 minutes (`ACCESS_TOKEN_TTL_MINUTES`). Delivered via `httpOnly`, `SameSite=Strict`, secure cookies (or `Authorization: Bearer` header for API clients).
- **Rotating Refresh Tokens:** Random 32-byte opaque tokens stored only as SHA-256 hashes in `sessions` table. Rotated on every use with family reuse detection (token theft revokes the entire login family).
- **Lockout Policy:** 5 consecutive failed logins lock the account for 15 minutes.
- **Anti-Enumeration:** Sign-up, forgot-password, and email resends return identical timing-neutral responses regardless of whether the account exists.

---

## 2. Resource-Level Authorization & IDOR Protection

PRISMS enforces multi-layered authorization on every endpoint:
1. **User Identity:** Verified through decoded token subject (`sub`).
2. **Student Ownership:** Scholars can access only submissions authored by their own profile. Attempting to view another student's submission via ID modification returns `403 Forbidden`.
3. **Supervision Boundary:** Supervisors can only inspect scholars mapped in `student_supervisor_assignments`. Unassigned supervisors receive `403 Forbidden`.
4. **Department Boundary:** HODs and DDPCs can only access submissions from scholars belonging to their assigned department.
5. **Reviewer Assignment Verification:** Workflow forwarding, returns, and rejections require the caller to hold an active, pending `ReviewAssignment` on the current `SubmissionStage`.

---

## 3. Document Storage & Streaming Security

### 3.1 Private Filesystem Storage
- Thesis documents are stored **outside the public web root** in a dedicated directory (`THESIS_STORAGE_PATH`, default `./storage/theses`).
- Files are named using unguessable random UUIDs (`storageKey = UUID.pdf`). Original filenames are stored only in the database and sanitized before use in `Content-Disposition`.
- Storage paths and keys are never exposed in public or unauthenticated responses.

### 3.2 Path Traversal Protection
All file operations validate that `storageKey` contains no directory traversal elements (`..`, `/`, `\`) and that the resolved absolute path starts strictly within the designated storage directory. Traversal attempts trigger `403 Forbidden` (`PATH_TRAVERSAL`).

### 3.3 Upload Validation
1. **Magic Bytes Verification:** Uploaded buffers are inspected for the authentic PDF header signature (`%PDF-` / `0x25 0x50 0x44 0x46 0x2D`). Extension renaming or fake MIME headers are rejected with `400 Bad Request` (`INVALID_FILE_SIGNATURE`).
2. **Non-Empty Check:** Zero-byte files are rejected immediately (`FILE_EMPTY`).
3. **Size Limit:** Server-side enforcement of `MAX_THESIS_FILE_SIZE_BYTES` (default 20 MiB). Files exceeding the limit are rejected with `413 Payload Too Large` (`FILE_TOO_LARGE`).
4. **SHA-256 Checksum:** Calculated at upload time and stored in `thesis_files` to guarantee data integrity across versions.

### 3.4 In-Portal Inline Viewing (Academic Book Reader)
- Component: `frontend/src/components/ThesisBookReader.tsx`
- Stream Endpoint: `GET /theses/:submissionId/file/view`
- Protected with:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="sanitized.pdf"`
  - `Cache-Control: private, no-store, must-revalidate`
  - `X-Content-Type-Options: nosniff`
- Prevents browsers and intermediaries from caching sensitive drafts locally.
- In-portal document rendering is performed client-side using `pdfjs-dist` on an isolated HTML5 `<canvas>`, eliminating unauthenticated `<iframe>` leaks and ensuring session credentials (`credentials: "include"`) are used.
- Reader provides academic navigation controls: page prev/next, jump to page, zoom controls, fit-to-width, fullscreen mode, and statutory view-only badges.

### 3.5 Download Restriction (HOD Institutional Policy)
- **HOD Download Prohibition:** Under NIT Hamirpur regulations, Head of Department users are strictly blocked from downloading thesis PDFs via `/theses/:submissionId/file/download`. Denials are audited with `reason: hod_download_prohibited`.
- **Multi-Role Enforcement:** Even if a faculty member holds multiple roles (e.g., HOD and Supervisor), when reviewing in the HOD stage or context of a departmental thesis, download requests are unconditionally denied with HTTP 403 `DOWNLOAD_FORBIDDEN_FOR_ROLE`. Only the student's designated individual research supervisor, author, or authorized institute authorities may download.
- **Client-Side Neutrality:** Permissions are enforced authoritatively by backend controllers; frontend UI displays a statutory `🔒 View-Only Mode` badge and omits download triggers.

---

## 4. Audit Logging

All security-sensitive operations are recorded in the `audit_events` table with actor, event type, entity, timestamp, IP address, user-agent, and outcome (`SUCCESS`, `DENIED`, `FAILURE`):
- `thesis.submitted`
- `thesis.resubmitted`
- `thesis.forwarded`
- `thesis.returned_for_revision`
- `thesis.rejected`
- `thesis.final_approved`
- `thesis.file_viewed`
- `thesis.file_downloaded`
- `thesis.file_download` (denied attempts)
- `authz.role_check`

---

## 5. Security Limitations of In-Portal Viewing

> [!NOTE]
> **Browser-Level Extraction Limitation:**
> While PRISMS prevents unauthorized network downloads, prevents public URL sharing, disables right-click context where supported in the portal, and sets `Cache-Control: private, no-store`, **no web application can prevent users from capturing screenshots, printing screens, or using external screen-recording software**. Security relies on strict access control, watermark integration, and legal/institutional accountability.
