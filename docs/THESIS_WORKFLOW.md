# PRISMS Thesis Workflow Specification

This document details the complete academic lifecycle of doctoral thesis submissions at NIT Hamirpur, from student drafting through supervisory review, departmental evaluation, parallel institutional review, revision loops, and final approval by the Chairperson Senate.

---

## 1. Architectural Principles

1. **Database as Single Source of Truth:** Workflow stages, assignments, and status transitions are governed entirely by database records and server-side state machine rules. The client cannot dictate transitions.
2. **Immutable Versioning:** Resubmitting after revision creates a new version (`submissionNumber` 2, 3, ...). Previous versions, uploaded files, and reviewer remarks remain permanently preserved.
3. **Transactional Safety:** Multi-table transitions (assignment completion, stage closure, next stage creation, status update) are executed inside atomic PostgreSQL transactions (`prisma.$transaction`).
4. **Dynamic Authority Routing:** Recipient lists are dynamically derived from verified database relationships (scholar's department and supervisor mappings) rather than client input.
5. **Parallel Branch Convergence:** When HOD routes a submission to both SDPC and Dean Academics in parallel, the workflow creates Stage 4 (Senate Review) only when **all** active parallel Stage 3 branches have concluded with approval.

---

## 2. Workflow Stage Sequence

| Sequence | Stage Code | Responsible Role | Recipient Selection | Allowed Actions | Statutory Constraints |
|:---:|:---|:---|:---|:---|:---|
| **0** | `DRAFT` | `STUDENT` | N/A | Save draft, Upload PDF, Submit | Pre-validation of supervisor mapping |
| **1** | `SUPERVISOR_REVIEW` | `SUPERVISOR` | HOD (scholar's dept) | Forward to HOD, Return for revision, Reject | Full document download permitted |
| **2** | `HOD_REVIEW` | `HOD` | SDPC, Dean Academics, or Both | Forward to SDPC/Dean, Return, Reject | **Strictly View-Only (Download Prohibited)** |
| **3A** | `SDPC_REVIEW` | `CHAIRPERSON_SDPC` | Chairperson Senate | Forward to Senate, Return, Reject | Parallel branch (waits for Dean if parallel) |
| **3B** | `DEAN_REVIEW` | `DEAN_ACADEMICS` | Chairperson Senate | Forward to Senate, Return, Reject | Parallel branch (waits for SDPC if parallel) |
| **4** | `SENATE_REVIEW` | `CHAIRPERSON_SENATE` | Final Authority | Final Approval (`APPROVED`), Return, Final Reject | Finalizes doctoral thesis |

---

## 3. Workflow State Transition Diagram

```mermaid
flowchart TD
    Draft(["Student Draft"]) -->|Upload & Submit| S1["Stage 1: Supervisor Review<br/>(Supervisor & DDPC Observer)"]
    
    S1 -->|Return for Revision| Rev["Status: REVISION_REQUIRED<br/>Feedback Released to Scholar"]
    S1 -->|Reject| Rej(["Status: REJECTED<br/>Thesis Closed"])
    S1 -->|Forward with Approval| S2["Stage 2: HOD Review<br/>(Department Scoped - Strictly View Only)"]
    
    S2 -->|Return for Revision| Rev
    S2 -->|Reject| Rej
    S2 -->|Forward: Single Branch| S3A["Stage 3A: Chairperson SDPC"]
    S2 -->|Forward: Parallel Branches| Parallel["Parallel Review Activation"]
    
    Parallel --> S3A
    Parallel --> S3B["Stage 3B: Dean Academics"]
    
    S3A -->|Branch Approved| CheckParallel{"Both Parallel Branches<br/>Completed?"}
    S3B -->|Branch Approved| CheckParallel
    
    CheckParallel -- No: Other branch pending --> Wait["Await Sister Branch Completion"]
    CheckParallel -- Yes: All branches approved --> S4["Stage 4: Chairperson Senate Review<br/>(Final Authority)"]
    
    S3A -->|Return for Revision| Rev
    S3B -->|Return for Revision| Rev
    
    Rev -->|Scholar Resubmits Revised PDF| S1_V2["Stage 1: Supervisor Review<br/>(New Submission Version N+1)"]
    S1_V2 --> S2
    
    S4 -->|Final Approval| App(["Status: APPROVED<br/>Thesis Closed & Archived"])
    S4 -->|Return for Revision| Rev
    S4 -->|Final Reject| Rej
```

---

## 4. Stage-by-Stage Lifecycle Walkthrough

### Stage A: Student Submission & Initial Routing
1. **Drafting:** The student creates and updates research metadata (`workingTitle`, `abstract`, `researchArea`) in their `theses` record.
2. **Upload:** Student uploads the thesis PDF. The server validates:
   - Size limit (default 20 MiB via `MAX_THESIS_FILE_SIZE_BYTES`).
   - Magic bytes signature (`%PDF-`).
   - Computes SHA-256 checksum and saves to private storage (`storageKey = UUID.pdf`).
3. **Formal Submission:** When the student clicks submit:
   - Verifies an active supervisor is mapped in `student_supervisor_assignments`.
   - Prevents duplicate initial submissions if one is already active (`SUBMITTED` or `IN_REVIEW`).
   - Creates a new `ThesisSubmission` row (`submissionNumber = 1`, `status = SUBMITTED`).
   - Creates `SubmissionStage` for `SUPERVISOR_REVIEW`.
   - Creates `ReviewAssignment` for the assigned supervisor.
   - Grants DDPC observer view access for departmental submissions.

### Stage B: Supervisor Review
- **Visibility:** Visible in the supervisor's active queue and the scholar's tracking list.
- **Actions:**
  - **Inline Viewing:** Document is streamed inline with restricted cache headers and byte-range support.
  - **Download:** Permitted for the assigned supervisor.
  - **Return for Revision:** Requires non-empty remarks. Marks status as `REVISION_REQUIRED`. Student is prompted to revise.
  - **Reject:** Sets status to `REJECTED`, thesis is `CLOSED`.
  - **Forward to HOD:** The supervisor requests `/theses/:id/recipients`. The backend dynamically returns deduplicated active HODs from the scholar's department. Supervisor approves and forwards. Stage advances to `HOD_REVIEW`.

### Stage C: HOD Review & Statutory Restriction
- **Mandatory Policy Rule:** **Head of Department review access is strictly confined to secure in-portal reading.**
- The inline viewing endpoint provides full reading capabilities, while the download endpoint returns **`403 Forbidden` (`DOWNLOAD_FORBIDDEN_FOR_ROLE`)**.
- **Recipient Selection:**
  - HOD can choose:
    1. **Chairperson SDPC**
    2. **Dean Academics**
    3. **Both (Parallel Review)**
- **Parallel Branches & Deduplication:**
  - If both are selected, two `SubmissionStage` records are activated in parallel (`SDPC_REVIEW` and `DEAN_REVIEW`).
  - Recipient lists are deduplicated by `userId` to eliminate duplicate checkboxes and React key warnings.

### Stage D: Institutional Parallel Review & Convergence
- **SDPC & Dean Review:** Both authorities review the submission concurrently in their respective queues.
- **Convergence Rule:**
  - When either reviewer completes their evaluation and forwards to Senate, the system queries whether any other Stage 3 branch is still in `PENDING` status.
  - If a sister branch is still pending, the completed branch transitions to `COMPLETED`, but Senate Review is **not** created.
  - When the final parallel branch is completed, the system detects that all Stage 3 branches have concluded and automatically creates Stage 4 (`SENATE_REVIEW`) with an assignment for the Chairperson Senate.
- **Halting on Revision/Rejection:**
  - If either SDPC or Dean requests a revision or rejection, all pending assignments across both branches are immediately marked `CANCELLED`.
  - The submission transitions to `REVISION_REQUIRED` or `REJECTED`.

### Stage E: Chairperson Senate (Final Authority)
- Chairperson Senate conducts final institute-level review.
- Final approval sets `ThesisSubmission.status = APPROVED` and `Thesis.status = CLOSED`.
- Audit logs record final approval and completion.

---

## 5. Resubmission and Version Preservation

When a thesis is returned with `REVISION_REQUIRED`:
1. The student reads the released feedback from reviewers.
2. The student uploads a new revised PDF document.
3. The student calls `POST /theses/resubmit`.
4. A new `ThesisSubmission` is generated with `submissionNumber = N + 1` (e.g. Version 2).
5. All previous versions (files, timestamps, stages, reviewer decisions) are preserved intact.
6. The workflow restarts at Stage 1 (Supervisor Review).

---

## 6. Audit Trail Integration

Every critical lifecycle transition triggers an immutable audit log entry in `audit_events`:
- `thesis.draft_saved`
- `thesis.submitted`
- `thesis.resubmitted`
- `thesis.forwarded`
- `thesis.returned_for_revision`
- `thesis.rejected`
- `thesis.final_approved`
- `thesis.file_viewed`
- `thesis.file_downloaded`
- `thesis.file_download` (`DENIED` when attempted by HOD)
