-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('DEPARTMENT', 'INSTITUTE');

-- CreateEnum
CREATE TYPE "ThesisStatus" AS ENUM ('IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'QUARANTINED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowStageStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('REVIEW_COMMENT');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "college_email" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "roll_number" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "program" TEXT NOT NULL,
    "enrollment_date" DATE NOT NULL,
    "expected_completion_date" DATE,
    "admission_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "employee_number" TEXT,
    "department_id" UUID NOT NULL,
    "designation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope_type" "RoleScope" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "department_id" UUID,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_supervisor_assignments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "assigned_by_user_id" UUID NOT NULL,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_supervisor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theses" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "working_title" TEXT NOT NULL,
    "abstract" TEXT,
    "research_area" TEXT,
    "status" "ThesisStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_submissions" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "submission_number" INTEGER NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "overall_due_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_files" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "sha256_checksum" TEXT,
    "scan_status" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "thesis_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stage_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "department_scoped" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_stage_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stage_roles" (
    "id" UUID NOT NULL,
    "stage_definition_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_stage_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_stages" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "stage_definition_id" UUID NOT NULL,
    "status" "WorkflowStageStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_assignments" (
    "id" UUID NOT NULL,
    "submission_stage_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "reviewer_role_id" UUID,
    "assigned_by_user_id" UUID,
    "assignment_status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "assignment_note" TEXT,

    CONSTRAINT "review_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "review_assignment_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "summary" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comments" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "stage_id" UUID,
    "review_assignment_id" UUID,
    "author_user_id" UUID NOT NULL,
    "comment_type" "CommentType" NOT NULL DEFAULT 'REVIEW_COMMENT',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "outcome" "AuditOutcome" NOT NULL,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_college_email_key" ON "users"("college_email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_roll_number_key" ON "students"("roll_number");

-- CreateIndex
CREATE INDEX "students_department_id_idx" ON "students"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_user_id_key" ON "faculty"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_employee_number_key" ON "faculty"("employee_number");

-- CreateIndex
CREATE INDEX "faculty_department_id_idx" ON "faculty"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "user_roles_user_id_valid_until_idx" ON "user_roles"("user_id", "valid_until");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_department_id_idx" ON "user_roles"("department_id");

-- CreateIndex
CREATE INDEX "student_supervisor_assignments_student_id_end_date_idx" ON "student_supervisor_assignments"("student_id", "end_date");

-- CreateIndex
CREATE INDEX "student_supervisor_assignments_faculty_id_end_date_idx" ON "student_supervisor_assignments"("faculty_id", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "theses_student_id_key" ON "theses"("student_id");

-- CreateIndex
CREATE INDEX "thesis_submissions_status_idx" ON "thesis_submissions"("status");

-- CreateIndex
CREATE INDEX "thesis_submissions_submitted_by_user_id_idx" ON "thesis_submissions"("submitted_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "thesis_submissions_thesis_id_submission_number_key" ON "thesis_submissions"("thesis_id", "submission_number");

-- CreateIndex
CREATE UNIQUE INDEX "thesis_files_storage_key_key" ON "thesis_files"("storage_key");

-- CreateIndex
CREATE INDEX "thesis_files_submission_id_idx" ON "thesis_files"("submission_id");

-- CreateIndex
CREATE INDEX "thesis_files_uploaded_by_user_id_idx" ON "thesis_files"("uploaded_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stage_definitions_code_key" ON "workflow_stage_definitions"("code");

-- CreateIndex
CREATE INDEX "workflow_stage_roles_role_id_idx" ON "workflow_stage_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stage_roles_stage_definition_id_role_id_key" ON "workflow_stage_roles"("stage_definition_id", "role_id");

-- CreateIndex
CREATE INDEX "submission_stages_status_idx" ON "submission_stages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "submission_stages_submission_id_stage_definition_id_key" ON "submission_stages"("submission_id", "stage_definition_id");

-- CreateIndex
CREATE INDEX "review_assignments_reviewer_user_id_assignment_status_idx" ON "review_assignments"("reviewer_user_id", "assignment_status");

-- CreateIndex
CREATE INDEX "review_assignments_reviewer_role_id_idx" ON "review_assignments"("reviewer_role_id");

-- CreateIndex
CREATE INDEX "review_assignments_submission_stage_id_idx" ON "review_assignments"("submission_stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_review_assignment_id_key" ON "reviews"("review_assignment_id");

-- CreateIndex
CREATE INDEX "review_comments_submission_id_created_at_idx" ON "review_comments"("submission_id", "created_at");

-- CreateIndex
CREATE INDEX "review_comments_stage_id_idx" ON "review_comments"("stage_id");

-- CreateIndex
CREATE INDEX "review_comments_review_assignment_id_idx" ON "review_comments"("review_assignment_id");

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_occurred_at_idx" ON "audit_events"("actor_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_event_type_occurred_at_idx" ON "audit_events"("event_type", "occurred_at");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_supervisor_assignments" ADD CONSTRAINT "student_supervisor_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_supervisor_assignments" ADD CONSTRAINT "student_supervisor_assignments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_supervisor_assignments" ADD CONSTRAINT "student_supervisor_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_submissions" ADD CONSTRAINT "thesis_submissions_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_submissions" ADD CONSTRAINT "thesis_submissions_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_files" ADD CONSTRAINT "thesis_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "thesis_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_files" ADD CONSTRAINT "thesis_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stage_roles" ADD CONSTRAINT "workflow_stage_roles_stage_definition_id_fkey" FOREIGN KEY ("stage_definition_id") REFERENCES "workflow_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stage_roles" ADD CONSTRAINT "workflow_stage_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_stages" ADD CONSTRAINT "submission_stages_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "thesis_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_stages" ADD CONSTRAINT "submission_stages_stage_definition_id_fkey" FOREIGN KEY ("stage_definition_id") REFERENCES "workflow_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_submission_stage_id_fkey" FOREIGN KEY ("submission_stage_id") REFERENCES "submission_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewer_role_id_fkey" FOREIGN KEY ("reviewer_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_review_assignment_id_fkey" FOREIGN KEY ("review_assignment_id") REFERENCES "review_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "thesis_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "submission_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_assignment_id_fkey" FOREIGN KEY ("review_assignment_id") REFERENCES "review_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
