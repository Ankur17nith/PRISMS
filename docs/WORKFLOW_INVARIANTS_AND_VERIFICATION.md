# PRISMS Workflow Invariants and Verification Report

**PhD Research & Institutional Scholars Management System (PRISMS)**  
**National Institute of Technology Hamirpur**  
*Document Generated: October 2026*

---

## 1. System Invariants & Statutory Rules

### A. Document Verification & Single Source of Truth
- **Cryptographic File Binding:** Every uploaded thesis is validated immediately for the `%PDF-` magic byte sequence and has its SHA-256 digest computed and stored upon upload.
- **Physical Document Correspondence:** The backend strictly verifies file existence on disk (`fs.existsSync`) before initiating streaming. Missing files return safe HTTP `404 FILE_NOT_FOUND` rather than crashing with unhandled streams.
- **Strict In-Portal Concurrency Control:** `ThesisBookReader` enforces sequential canvas lifecycle operations via render sequence tokens and cancellation of active PDF.js render tasks (`RenderingCancelledException` handled without error banners).

### B. Access Control & Statutory Download Prohibitions
- **HOD Statutory Download Denial:** Under NIT Hamirpur academic statutes, the Head of Department (HOD) possesses departmental review authority but is strictly prohibited from downloading thesis PDF documents. The backend enforces HTTP `403 DOWNLOAD_FORBIDDEN_FOR_ROLE`, and `ThesisBookReader` replaces the download control with a locked `View-Only Mode` badge.
- **Assigned Supervisor Rights:** Direct supervisors are granted download rights for their assigned research scholars.
- **Student IDOR Protection:** Scholars are restricted to viewing and downloading only their own submitted thesis documents. Access to another scholar's submission returns HTTP `403 FORBIDDEN`.

### C. Authority Routing & Recipient Discovery
- **Departmental Scoping:** When a supervisor forwards a thesis, the recipient list `/theses/:id/recipients` queries strictly active HOD users within the scholar's academic department (`departmentId`).
- **Parallel Routing at HOD Level:** HOD reviewers can choose to forward simultaneously to both Chairperson SDPC and Dean Academics, or to either authority individually.
- **Role Context Switching:** Faculty holding multiple simultaneous appointments (e.g., Professor holding both `HOD` and `SUPERVISOR`) switch context cleanly. Access permissions, review queues, and download policies adapt dynamically to the `actingRole` parameter.

### D. Workflow State & Tracking Consistency
- **No Contradictory Status Claims:** The review workspace dynamically checks whether the acting reviewer previously completed an evaluation on that submission. If the thesis is pending at a stage not yet reviewed by the acting user (such as `SUPERVISOR_REVIEW` viewed by HOD), the tracking panel clearly states:
  > *"This submission is currently awaiting evaluation at stage: [Stage Name]. You are viewing this record in institutional tracking mode."*
- **Persistent Server Timestamps:** All dates and times are persisted on the server and displayed across scholar history and review workspaces in Indian Standard Time (IST) (e.g., `29 Oct 2026, 09:31 PM IST`).

---

## 2. Verification & Automated Test Suite

### Backend Test Suite (`npm test`)
- **Total Test Suites:** 16
- **Total Tests Passed:** 66
- **Failures / Regressions:** 0
- **Execution Time:** ~1.6 seconds

```text
▶ Faculty Role Normalization & Deduplication (5 tests)
▶ ThesisBookReader Concurrency & Canvas Coordination (3 tests)
▶ PRISMS Thesis Workflow & Security Integration Suite
  ▶ A. Student Submission Lifecycle & File Validation (9 tests)
  ▶ B. Supervisor Review, Recipient Selection & Forwarding (6 tests)
  ▶ C. DDPC Observer Permissions (2 tests)
  ▶ D. HOD Review, Recipient Selection & Download Denial (7 tests)
  ▶ E. Return for Revision, Student Feedback & Resubmission (4 tests)
  ▶ F. Full Chain to Final Approval (Supervisor -> HOD -> SDPC -> Senate) (4 tests)
  ▶ G. Supervisor Scholar Tracking Dashboard (5 tests)
  ▶ H. Formal Rejection Lifecycle (4 tests)
  ▶ I. File Size Limits & Edge Cases (1 test)
  ▶ J. Single Account Holding Multiple Roles (3 tests)
  ▶ K. Comprehensive Audit Trail Verification (1 test)
  ▶ L. Frontend Integration & Data Contract Regressions (6 tests)
  ▶ M. Thesis Routing, Authority Assignments & Reader Permissions (6 tests)
```

### Frontend Build & Type Validation (`npm run typecheck`, `npm run build`)
- **TypeScript:** Clean compilation (`tsc --noEmit`), 0 errors.
- **Next.js Production Build:** 28 static and dynamic routes compiled successfully.
- **Route Summary:**
  - Student Portal: `/student/dashboard`, `/student/thesis/submit`, `/student/thesis/details`, `/student/thesis/history`, `/student/thesis/reader`
  - Faculty Portal: `/faculty/dashboard`, `/faculty/queue`, `/faculty/reviews/[id]`, `/faculty/reviews/[id]/hod`, `/faculty/scholars`, `/faculty/scholars/[id]`, `/faculty/thesis/reader/[id]`
  - Institutional Pages: `/`, `/login`, `/about`, `/guidelines`, `/workflow`, `/contact`

---

## 3. Developer Profile Verification
Footer developer profile links across `ApplicationShell.tsx`, `page.tsx`, and `login/page.tsx` point to:
- **Ankur Gupta:** `https://ankur-portfolio-topaz.vercel.app/` (`target="_blank" rel="noopener noreferrer"`)
- **Aditya Sharma:** `https://github.com/itzzadi04` (`target="_blank" rel="noopener noreferrer"`)
