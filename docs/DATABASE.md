# PRISMS Database Architecture & Schema Specification

This document provides the canonical reference for the PostgreSQL relational database schema of the **PhD Research & Institutional Scholars Management System (PRISMS)**, managed using Prisma ORM.

---

## 1. Database Philosophy & Design Principles

1. **UUID Primary Keys:** All tables use PostgreSQL `uuid` primary keys (`gen_random_uuid()` / `@default(uuid()) @db.Uuid`) to prevent ID enumeration attacks.
2. **Auditability & Traceability:** All significant lifecycle and authentication events are captured in the immutable `audit_events` table with IP, user agent, outcome, and metadata.
3. **Strict Referencing & Data Isolation:** Files are referenced strictly by unique `storage_key` UUIDs rather than direct filesystem paths.
4. **State Machine Integrity:** Thesis submissions (`thesis_submissions`), stages (`submission_stages`), and assignments (`review_assignments`) form a strict state machine with unique constraints (e.g. `@@unique([thesisId, submissionNumber])` and `@@unique([submissionId, stageDefinitionId])`).

---

## 2. Entity Relationship Overview

```mermaid
erDiagram
    User ||--o| Student : "has profile"
    User ||--o| Faculty : "has profile"
    User ||--o{ UserRole : "holds roles"
    Department ||--o{ Student : "contains"
    Department ||--o{ Faculty : "employs"
    Department ||--o{ UserRole : "scopes"
    Role ||--o{ UserRole : "assigned in"

    Student ||--o{ StudentSupervisorAssignment : "supervised under"
    Faculty ||--o{ StudentSupervisorAssignment : "supervises"

    Student ||--o| Thesis : "authors"
    Thesis ||--o{ ThesisSubmission : "versioned into"
    ThesisSubmission ||--o{ ThesisFile : "attaches"
    ThesisSubmission ||--o{ SubmissionStage : "progresses through"
    WorkflowStageDefinition ||--o{ SubmissionStage : "defines"
    SubmissionStage ||--o{ ReviewAssignment : "assigns to"
    ReviewAssignment ||--o| Review : "decides"
    SubmissionStage ||--o{ ReviewComment : "records"

    User ||--o{ Session : "authenticates"
    User ||--o{ AuditEvent : "performs"
```

---

## 3. Schema Models Reference

### 3.1 Identity & Access Models
- **`users` (`User`):** Central authentication record (`id`, `college_email`, `password_hash`, `full_name`, `phone`, `account_status`, `email_verified_at`, `failed_login_count`, `locked_until`).
- **`departments` (`Department`):** Academic departments (`id`, `code`, `name`). Example: `CSE` (Computer Science and Engineering).
- **`students` (`Student`):** Scholar profile (`id`, `user_id`, `roll_number`, `department_id`, `program`, `enrollment_date`, `admission_status`).
- **`faculty` (`Faculty`):** Academic staff profile (`id`, `user_id`, `employee_number`, `department_id`, `designation`).
- **`roles` (`Role`):** Institutional role definitions (`code`, `name`, `scope_type`). Standard codes: `STUDENT`, `SUPERVISOR`, `HOD`, `SDPC`, `CHAIRPERSON_SDPC`, `DEAN`, `DEAN_ACADEMICS`, `SENATE`, `CHAIRPERSON_SENATE`, `ADMIN`.
- **`user_roles` (`UserRole`):** User-to-role mappings (`userId`, `roleId`, `departmentId`, `validFrom`, `validUntil`).
- **`student_supervisor_assignments` (`StudentSupervisorAssignment`):** Links doctoral scholars to assigned research supervisors with effective dates.

### 3.2 Workflow & Submission Models
- **`theses` (`Thesis`):** Scholar's overall doctoral dissertation project (`studentId`, `workingTitle`, `abstract`, `researchArea`, `status`). Statuses: `IN_PROGRESS`, `CLOSED`.
- **`thesis_submissions` (`ThesisSubmission`):** Versioned submission instances (`thesisId`, `submissionNumber`, `status`, `submittedAt`, `closedAt`). Statuses: `SUBMITTED`, `IN_REVIEW`, `REVISION_REQUIRED`, `APPROVED`, `REJECTED`, `WITHDRAWN`.
- **`thesis_files` (`ThesisFile`):** Stored dissertation PDF documents (`submissionId`, `storageKey`, `originalFilename`, `fileSizeBytes`, `sha256Checksum`, `mimeType`, `isPrimary`).
- **`workflow_stage_definitions` (`WorkflowStageDefinition`):** Definitions for sequential/parallel stages (`code`, `name`, `sequenceNumber`, `departmentScoped`). Stages: `SUPERVISOR_REVIEW` (Seq 1), `HOD_REVIEW` (Seq 2), `SDPC_REVIEW` (Seq 3), `DEAN_REVIEW` (Seq 3), `SENATE_REVIEW` (Seq 4).
- **`submission_stages` (`SubmissionStage`):** Instantiated stage for a specific submission version (`submissionId`, `stageDefinitionId`, `status`, `startedAt`, `completedAt`). Statuses: `PENDING`, `COMPLETED`, `CANCELLED`.
- **`review_assignments` (`ReviewAssignment`):** Specific review tasks assigned to reviewers (`submissionStageId`, `reviewerUserId`, `reviewerRoleId`, `assignmentStatus`). Statuses: `ASSIGNED`, `ACCEPTED`, `COMPLETED`, `CANCELLED`.
- **`reviews` (`Review`):** Formal reviewer decision record (`reviewAssignmentId`, `decision`, `summary`, `decidedAt`). Decisions: `APPROVE`, `REJECT`.
- **`review_comments` (`ReviewComment`):** Feedback and remarks released to scholar or reviewers (`submissionId`, `stageId`, `authorUserId`, `body`).

### 3.3 Security, Sessions & Audit
- **`sessions` (`Session`):** Active user sessions tracking rotating refresh tokens (`tokenHash`, `familyId`, `ipAddress`, `userAgent`, `expiresAt`, `revokedAt`).
- **`user_tokens` (`UserToken`):** Tokens for email verification and password reset (`tokenHash`, `type`, `expiresAt`, `usedAt`).
- **`audit_events` (`AuditEvent`):** Immutable compliance event log (`actorUserId`, `eventType`, `entityType`, `entityId`, `outcome`, `metadata`, `occurredAt`).

---

## 4. Key Indexes & Performance Considerations

| Table | Index Columns | Purpose |
|:---|:---|:---|
| `users` | `college_email` (UNIQUE) | Fast credential authentication lookup |
| `user_roles` | `[user_id, valid_until]` | Instant role resolution for active user tokens |
| `thesis_submissions` | `[thesis_id, submission_number]` (UNIQUE) | Strict immutable version sequencing |
| `submission_stages` | `[submission_id, stage_definition_id]` (UNIQUE) | Prevention of duplicate parallel stages |
| `review_assignments` | `[reviewer_user_id, assignment_status]` | Instant faculty review queue filtering |
| `thesis_files` | `storage_key` (UNIQUE) | Rapid filesystem pointer lookup for file streaming |
| `sessions` | `token_hash` (UNIQUE), `[user_id, revoked_at]` | Fast session validation and revocation |
| `audit_events` | `[event_type, occurred_at]`, `[actor_user_id, occurred_at]` | Traceability audits and log querying |

---

## 5. Database Migrations & Seeding

### Applying Migrations
All migrations reside in `backend/prisma/migrations/`.
```bash
# Apply pending migrations to active database
DATABASE_URL="postgresql://prisms_app:password@localhost:5433/prisms?schema=public" npx prisma migrate deploy
```

### Seeding Initial Institutional Data
The idempotent seed script (`backend/prisma/seed.ts`) configures:
- Department of Computer Science & Engineering (CSE)
- Default institutional roles (`STUDENT`, `SUPERVISOR`, `HOD`, `SDPC`, `DEAN`, `SENATE`, `ADMIN`)
- Stage definitions (`SUPERVISOR_REVIEW`, `HOD_REVIEW`, `SDPC_REVIEW`, `DEAN_REVIEW`, `SENATE_REVIEW`)
- Initial faculty and scholar test accounts:
  - Supervisor: `supervisor1@example.test` (Dr. Rajesh Kumar)
  - HOD: `hod.cse@example.test` (Prof. Anil Verma)
  - Chairperson SDPC: `sdpc@example.test` (Dr. Vikram Malhotra)
  - Dean Academics: `dean.acad@example.test` (Prof. Sanjay Gupta)
  - Chairperson Senate: `senate.chair@example.test` (Director)
  - Scholar 1: `aarav.sharma@example.test` (`21PHDCSE01`)
  - Scholar 2: `sneha.patel@example.test` (`21PHDCSE02`)
