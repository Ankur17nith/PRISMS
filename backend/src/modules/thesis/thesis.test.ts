import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../auth/auth.tokens.js";
import { ROLES, STAGE_CODES } from "./thesis.constants.js";
import { fileExists } from "../../lib/storage.js";

// Helper to create a valid minimal PDF buffer
const createPdfBuffer = (text = "PRISMS Thesis Document Content") =>
  Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${text.length} >>\nstream\n${text}\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000185 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF`);

describe("PRISMS Thesis Workflow & Security Integration Suite", () => {
  let student1Token: string;
  let student1Id: string;
  let student1UserId: string;

  let student2Token: string;
  let student2UserId: string;

  let supervisor1Token: string;
  let supervisor1UserId: string;

  let supervisor2Token: string;
  let supervisor2UserId: string;

  let hodToken: string;
  let hodUserId: string;

  let ddpcToken: string;
  let ddpcUserId: string;

  let sdpcToken: string;
  let sdpcUserId: string;

  let deanToken: string;
  let deanUserId: string;

  let chairmanToken: string;
  let chairmanUserId: string;

  let uploadedStorageKey: string;
  let submissionId: string;

  before(async () => {
    // 0. Pre-flight Database Connectivity Diagnostic
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbErr: any) {
      console.error("\n" + "=".repeat(70));
      console.error("PRISMS DATABASE CONNECTION FAILURE IN TEST SUITE:");
      console.error("Could not reach PostgreSQL server at port 5433.");
      console.error("Active DB Target:", process.env.DATABASE_URL_TEST || process.env.DATABASE_URL);
      console.error("Diagnostic Error:", dbErr?.message || dbErr);
      console.error("Resolution:");
      console.error("  Start local PostgreSQL server with: postgres -D backend/db/postgres_data");
      console.error("  Or start docker container with: docker compose up -d postgres");
      console.error("=".repeat(70) + "\n");
      throw new Error(
        "Database connection failed: Cannot connect to PostgreSQL at port 5433. Ensure database server is running."
      );
    }

    // Resolve seeded accounts
    const s1 = await prisma.user.findUniqueOrThrow({
      where: { collegeEmail: "student1@example.test" },
      include: { studentProfile: true },
    });
    student1UserId = s1.id;
    student1Id = s1.studentProfile!.id;
    student1Token = signAccessToken(s1.id);

    const s2 = await prisma.user.findUniqueOrThrow({
      where: { collegeEmail: "student2@example.test" },
    });
    student2UserId = s2.id;
    student2Token = signAccessToken(s2.id);

    const sup1 = await prisma.user.findUniqueOrThrow({ where: { collegeEmail: "supervisor1@example.test" } });
    supervisor1UserId = sup1.id;
    supervisor1Token = signAccessToken(sup1.id);

    const sup2 = await prisma.user.findUniqueOrThrow({ where: { collegeEmail: "supervisor2@example.test" } });
    supervisor2UserId = sup2.id;
    supervisor2Token = signAccessToken(sup2.id);

    const hod = await prisma.user.findUniqueOrThrow({ where: { collegeEmail: "hod.cse@example.test" } });
    hodUserId = hod.id;
    hodToken = signAccessToken(hod.id);

    const ddpc = await prisma.user.findUniqueOrThrow({ where: { collegeEmail: "ddpc.cse@example.test" } });
    ddpcUserId = ddpc.id;
    ddpcToken = signAccessToken(ddpc.id);

    const sdpc = await prisma.user.findUniqueOrThrow({ where: { collegeEmail: "sdpc@example.test" } });
    sdpcUserId = sdpc.id;
    sdpcToken = signAccessToken(sdpc.id);

    const dean = await prisma.user.findUniqueOrThrow({ where: { collegeEmail: "dean@example.test" } });
    deanUserId = dean.id;
    deanToken = signAccessToken(dean.id);

    const ch = await prisma.user.findUniqueOrThrow({ where: { collegeEmail: "chairman@example.test" } });
    chairmanUserId = ch.id;
    chairmanToken = signAccessToken(ch.id);

    // Clean up any previous test submissions for student 1
    const prevTheses = await prisma.thesis.findMany({ where: { studentId: student1Id } });
    for (const t of prevTheses) {
      await prisma.reviewComment.deleteMany({ where: { submission: { thesisId: t.id } } });
      await prisma.review.deleteMany({ where: { assignment: { stage: { submission: { thesisId: t.id } } } } });
      await prisma.reviewAssignment.deleteMany({ where: { stage: { submission: { thesisId: t.id } } } });
      await prisma.submissionStage.deleteMany({ where: { submission: { thesisId: t.id } } });
      await prisma.thesisFile.deleteMany({ where: { submission: { thesisId: t.id } } });
      await prisma.thesisSubmission.deleteMany({ where: { thesisId: t.id } });
      await prisma.thesis.delete({ where: { id: t.id } });
    }
  });

  // ---------------------------------------------------------------------------
  // A. Student Submission Tests
  // ---------------------------------------------------------------------------
  describe("A. Student Submission Lifecycle & File Validation", () => {
    it("should reject unauthenticated submission attempts with 401", async () => {
      const res = await request(app).post("/theses/submit").send({ workingTitle: "Test Title" });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, "UNAUTHENTICATED");
    });

    it("should allow student to fetch draft metadata and assigned supervisor", async () => {
      const res = await request(app)
        .get("/theses/draft")
        .set("Authorization", `Bearer ${student1Token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.student.rollNumber, "21PHDCSE01");
      assert.equal(res.body.supervisor.email, "supervisor1@example.test");
    });

    it("should allow student to save or update draft metadata", async () => {
      const res = await request(app)
        .put("/theses/draft")
        .set("Authorization", `Bearer ${student1Token}`)
        .send({
          workingTitle: "Scalable Distributed Consensus in Heterogeneous Edge Networks",
          abstract: "This doctoral dissertation investigates high-throughput, low-latency consensus protocols.",
          researchArea: "Distributed Systems & Cloud Computing",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.thesis.workingTitle, "Scalable Distributed Consensus in Heterogeneous Edge Networks");
    });

    it("should reject empty file upload", async () => {
      const res = await request(app)
        .post("/theses/upload")
        .set("Authorization", `Bearer ${student1Token}`)
        .attach("file", Buffer.from(""), "empty.pdf");

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "FILE_EMPTY");
    });

    it("should reject file with invalid non-PDF signature", async () => {
      const res = await request(app)
        .post("/theses/upload")
        .set("Authorization", `Bearer ${student1Token}`)
        .attach("file", Buffer.from("This is a plain text file, not a real PDF!"), "fake.pdf");

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "INVALID_FILE_SIGNATURE");
    });

    it("should accept authentic PDF upload, compute SHA-256 and store privately", async () => {
      const pdfBytes = createPdfBuffer("Official PhD Thesis Chapter 1");
      const res = await request(app)
        .post("/theses/upload")
        .set("Authorization", `Bearer ${student1Token}`)
        .attach("file", pdfBytes, "final_thesis_submission.pdf");

      assert.equal(res.status, 201);
      assert.ok(res.body.file.storageKey);
      assert.ok(res.body.file.sha256Checksum);
      assert.equal(res.body.file.mimeType, "application/pdf");

      uploadedStorageKey = res.body.file.storageKey;
      assert.equal(fileExists(uploadedStorageKey), true);
    });

    it("should submit thesis with valid metadata and uploaded PDF file", async () => {
      const res = await request(app)
        .post("/theses/submit")
        .set("Authorization", `Bearer ${student1Token}`)
        .send({
          workingTitle: "Scalable Distributed Consensus in Heterogeneous Edge Networks",
          storageKey: uploadedStorageKey,
          originalFilename: "final_thesis_submission.pdf",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.submissionNumber, 1);
      assert.equal(res.body.status, "SUBMITTED");
      assert.equal(res.body.currentStage, "Supervisor Review");

      submissionId = res.body.submissionId;
      assert.ok(submissionId);
    });

    it("should reject duplicate concurrent initial submission while one is under review", async () => {
      const res = await request(app)
        .post("/theses/submit")
        .set("Authorization", `Bearer ${student1Token}`)
        .send({
          workingTitle: "Concurrent Duplicate Attempt",
          storageKey: uploadedStorageKey,
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, "CONCURRENT_SUBMISSION_EXISTS");
    });

    it("should prevent student 2 from reading student 1's submission (IDOR protection)", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}`)
        .set("Authorization", `Bearer ${student2Token}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, "FORBIDDEN");
    });
  });

  // ---------------------------------------------------------------------------
  // B. Supervisor Review & Forwarding Tests
  // ---------------------------------------------------------------------------
  describe("B. Supervisor Review, Recipient Selection & Forwarding", () => {
    it("should display submission in assigned Supervisor's queue", async () => {
      const res = await request(app)
        .get("/theses/queue")
        .set("Authorization", `Bearer ${supervisor1Token}`);

      assert.equal(res.status, 200);
      const task = res.body.tasks.find((t: any) => t.submissionId === submissionId);
      assert.ok(task);
      assert.equal(task.rollNumber, "21PHDCSE01");
      assert.equal(task.stageCode, "SUPERVISOR_REVIEW");
    });

    it("should not display submission in unassigned supervisor 2's queue", async () => {
      const res = await request(app)
        .get("/theses/queue")
        .set("Authorization", `Bearer ${supervisor2Token}`);

      assert.equal(res.status, 200);
      const task = res.body.tasks.find((t: any) => t.submissionId === submissionId);
      assert.equal(task, undefined);
    });

    it("should allow assigned supervisor to inspect submission details", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}`)
        .set("Authorization", `Bearer ${supervisor1Token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.submission.id, submissionId);
      assert.equal(res.body.submission.scholar.rollNumber, "21PHDCSE01");
    });

    it("should return ONLY authorized HOD recipients for the scholar's department", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}/recipients`)
        .set("Authorization", `Bearer ${supervisor1Token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.allowedSelection, "single");
      assert.ok(res.body.recipients.length >= 1);
      const hodRecipient = res.body.recipients.find((r: any) => r.userId === hodUserId);
      assert.ok(hodRecipient);
      assert.equal(hodRecipient.roleCode, "HOD");
    });

    it("should reject forwarding with forged or arbitrary recipient ID", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${supervisor1Token}`)
        .send({
          summary: "Forged recipient attempt",
          recipientUserIds: [student2UserId], // student is not an authorized HOD
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "UNAUTHORIZED_RECIPIENT");
    });

    it("should allow supervisor to forward to eligible HOD and advance stage to HOD_REVIEW", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${supervisor1Token}`)
        .send({
          summary: "Thesis reviewed and endorsed for departmental consideration.",
          recipientUserIds: [hodUserId],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, "FORWARDED");

      // Verify stage transition in DB
      const sub = await prisma.thesisSubmission.findUnique({
        where: { id: submissionId },
        include: { stages: { include: { definition: true, assignments: true } } },
      });
      assert.equal(sub?.status, "IN_REVIEW");
      const activeStage = sub?.stages.find((s) => s.status === "PENDING");
      assert.equal(activeStage?.definition.code, "HOD_REVIEW");
      assert.equal(activeStage?.assignments[0]?.reviewerUserId, hodUserId);
    });
  });

  // ---------------------------------------------------------------------------
  // C. DDPC Observer Visibility Tests
  // ---------------------------------------------------------------------------
  describe("C. DDPC Observer Permissions", () => {
    it("should allow DDPC to view departmental thesis submission details", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}`)
        .set("Authorization", `Bearer ${ddpcToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.submission.id, submissionId);
    });

    it("should reject DDPC attempt to execute transitions when not assigned reviewer", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${ddpcToken}`)
        .send({
          summary: "Unauthorized transition by DDPC",
          recipientUserIds: [sdpcUserId],
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, "FORBIDDEN");
    });
  });

  // ---------------------------------------------------------------------------
  // D. HOD Review & Strict Download Restriction Tests
  // ---------------------------------------------------------------------------
  describe("D. HOD Review, Recipient Selection & Download Denial", () => {
    it("should allow HOD to view thesis document inline in portal", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}/file/view`)
        .set("Authorization", `Bearer ${hodToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.headers["content-type"], "application/pdf");
      assert.ok(res.headers["content-disposition"].startsWith("inline"));
      assert.equal(res.headers["x-content-type-options"], "nosniff");
    });

    it("MANDATORY RULE: HOD must NEVER be allowed to download thesis documents", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}/file/download`)
        .set("Authorization", `Bearer ${hodToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, "DOWNLOAD_FORBIDDEN_FOR_ROLE");
      assert.match(res.body.error.message, /HOD is not permitted to download/i);
    });

    it("should allow assigned Supervisor to download thesis document", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}/file/download`)
        .set("Authorization", `Bearer ${supervisor1Token}`);

      assert.equal(res.status, 200);
      assert.equal(res.headers["content-type"], "application/pdf");
      assert.ok(res.headers["content-disposition"].startsWith("attachment"));
    });

    it("should provide HOD with eligible SDPC and Dean Academics recipients for parallel/single routing", async () => {
      const res = await request(app)
        .get(`/theses/${submissionId}/recipients`)
        .set("Authorization", `Bearer ${hodToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.allowedSelection, "single_or_both");
      const hasSdpc = res.body.recipients.some((r: any) => r.userId === sdpcUserId);
      const hasDean = res.body.recipients.some((r: any) => r.userId === deanUserId);
      assert.ok(hasSdpc);
      assert.ok(hasDean);
    });

    it("should allow HOD to forward in parallel to BOTH SDPC and Dean Academics", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${hodToken}`)
        .send({
          summary: "Forwarded to both SDPC Chairperson and Dean Academics for parallel review.",
          recipientUserIds: [sdpcUserId, deanUserId],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, "FORWARDED");

      // Verify that two pending stages were started in parallel
      const sub = await prisma.thesisSubmission.findUnique({
        where: { id: submissionId },
        include: { stages: { where: { status: "PENDING" }, include: { definition: true, assignments: true } } },
      });
      assert.equal(sub?.stages.length, 2);
      const sdpcStage = sub?.stages.find((s) => s.definition.code === "SDPC_REVIEW");
      const deanStage = sub?.stages.find((s) => s.definition.code === "DEAN_REVIEW");
      assert.ok(sdpcStage);
      assert.ok(deanStage);
    });
  });

  // ---------------------------------------------------------------------------
  // E. Return for Revision, Student Feedback & Resubmission Tests
  // ---------------------------------------------------------------------------
  describe("E. Return for Revision, Student Feedback & Resubmission", () => {
    it("should allow SDPC reviewer to return submission with mandatory remarks", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/return`)
        .set("Authorization", `Bearer ${sdpcToken}`)
        .send({
          remarks: "Chapter 4 methodology requires detailed statistical power analysis and citation of recent 2025 benchmarks.",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, "REVISION_REQUIRED");

      // Verify status and closure in DB
      const sub = await prisma.thesisSubmission.findUnique({ where: { id: submissionId } });
      assert.equal(sub?.status, "REVISION_REQUIRED");
      assert.ok(sub?.closureReason?.includes("statistical power analysis"));
    });

    it("should reject return with empty or whitespace-only remarks", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/return`)
        .set("Authorization", `Bearer ${sdpcToken}`)
        .send({ remarks: "   " });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("should allow student to view released review feedback and required revisions", async () => {
      const res = await request(app)
        .get("/theses/my")
        .set("Authorization", `Bearer ${student1Token}`);

      assert.equal(res.status, 200);
      const sub = res.body.submissions.find((s: any) => s.id === submissionId);
      assert.equal(sub.status, "REVISION_REQUIRED");
      assert.ok(sub.feedback.length >= 1);
      assert.ok(sub.feedback[0].body.includes("statistical power analysis"));
    });

    it("should allow student to upload revised PDF and submit new version 2", async () => {
      const revPdf = createPdfBuffer("Revised PhD Thesis with Statistical Benchmarks");
      const uploadRes = await request(app)
        .post("/theses/upload")
        .set("Authorization", `Bearer ${student1Token}`)
        .attach("file", revPdf, "revised_thesis_v2.pdf");

      assert.equal(uploadRes.status, 201);
      const revKey = uploadRes.body.file.storageKey;

      const resubmitRes = await request(app)
        .post("/theses/resubmit")
        .set("Authorization", `Bearer ${student1Token}`)
        .send({
          storageKey: revKey,
          originalFilename: "revised_thesis_v2.pdf",
          studentNote: "Addressed all methodology and citation feedback in Chapter 4.",
        });

      assert.equal(resubmitRes.status, 201);
      assert.equal(resubmitRes.body.submissionNumber, 2);
      assert.equal(resubmitRes.body.status, "SUBMITTED");
      assert.equal(resubmitRes.body.currentStage, "Supervisor Review");

      // Original submission version 1 remains intact
      const sub1 = await prisma.thesisSubmission.findUnique({ where: { id: submissionId } });
      assert.equal(sub1?.submissionNumber, 1);
      assert.equal(sub1?.status, "REVISION_REQUIRED");

      // Update submissionId to version 2 for onward flow
      submissionId = resubmitRes.body.submissionId;
    });
  });

  // ---------------------------------------------------------------------------
  // F. Complete Workflow: Forwarding to Senate & Final Approval
  // ---------------------------------------------------------------------------
  describe("F. Full Chain to Final Approval (Supervisor -> HOD -> SDPC -> Senate)", () => {
    it("Supervisor approves and forwards Version 2 to HOD", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${supervisor1Token}`)
        .send({
          summary: "Version 2 changes verified. Forwarding to HOD.",
          recipientUserIds: [hodUserId],
        });
      assert.equal(res.status, 200);
    });

    it("HOD forwards Version 2 to SDPC", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${hodToken}`)
        .send({
          summary: "Endorsed to SDPC Chairperson.",
          recipientUserIds: [sdpcUserId],
        });
      assert.equal(res.status, 200);
    });

    it("SDPC forwards Version 2 to Chairperson Senate", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${sdpcToken}`)
        .send({
          summary: "SDPC review complete. Forwarding for final Senate approval.",
          recipientUserIds: [chairmanUserId],
        });
      assert.equal(res.status, 200);
    });

    it("Chairperson Senate grants final approval", async () => {
      const res = await request(app)
        .post(`/theses/${submissionId}/forward`)
        .set("Authorization", `Bearer ${chairmanToken}`)
        .send({
          summary: "Degree requirements fulfilled. Final thesis approved by Chairperson Senate.",
          recipientUserIds: [], // Final authority has no further recipients
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, "APPROVED");

      // Verify thesis is CLOSED and submission is APPROVED
      const sub = await prisma.thesisSubmission.findUnique({
        where: { id: submissionId },
        include: { thesis: true },
      });
      assert.equal(sub?.status, "APPROVED");
      assert.equal(sub?.thesis.status, "CLOSED");
    });
  });

  // ---------------------------------------------------------------------------
  // G. Supervisor Scholar Tracking Dashboard Tests
  // ---------------------------------------------------------------------------
  describe("G. Supervisor Scholar Tracking Dashboard", () => {
    it("should allow supervisor to list scholars with pagination and status", async () => {
      const res = await request(app)
        .get("/theses/supervisor/scholars?status=all")
        .set("Authorization", `Bearer ${supervisor1Token}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.scholars.length >= 1);
      const scholar = res.body.scholars.find((s: any) => s.rollNumber === "21PHDCSE01");
      assert.ok(scholar);
      assert.equal(scholar.supervisionStatus, "CURRENT");
      assert.equal(scholar.thesis.latestSubmissionStatus, "APPROVED");
      assert.equal(scholar.thesis.status, "CLOSED");
    });

    it("should allow supervisor to view full submission history and versions for scholar", async () => {
      const res = await request(app)
        .get(`/theses/supervisor/scholars/${student1Id}`)
        .set("Authorization", `Bearer ${supervisor1Token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.scholar.rollNumber, "21PHDCSE01");
      assert.equal(res.body.thesis.submissions.length, 2);
      assert.equal(res.body.thesis.submissions[0].submissionNumber, 2);
      assert.equal(res.body.thesis.submissions[1].submissionNumber, 1);
    });

    it("should prevent unauthorized supervisor from viewing scholar history", async () => {
      const res = await request(app)
        .get(`/theses/supervisor/scholars/${student1Id}`)
        .set("Authorization", `Bearer ${supervisor2Token}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, "FORBIDDEN");
    });
  });

  // ---------------------------------------------------------------------------
  // H. Rejection Lifecycle Tests (Student 2)
  // ---------------------------------------------------------------------------
  describe("H. Formal Rejection Lifecycle", () => {
    let student2SubmissionId: string;

    it("should allow student 2 to submit an initial thesis", async () => {
      const pdf = createPdfBuffer("Student 2 Thesis Draft");
      const upRes = await request(app)
        .post("/theses/upload")
        .set("Authorization", `Bearer ${student2Token}`)
        .attach("file", pdf, "student2_thesis.pdf");
      assert.equal(upRes.status, 201);

      const subRes = await request(app)
        .post("/theses/submit")
        .set("Authorization", `Bearer ${student2Token}`)
        .send({
          workingTitle: "Novel Quantum Cryptographic Schemes for Secure Computation",
          storageKey: upRes.body.file.storageKey,
        });

      assert.equal(subRes.status, 201);
      student2SubmissionId = subRes.body.submissionId;
    });

    it("should reject rejection attempt with whitespace-only remarks", async () => {
      const res = await request(app)
        .post(`/theses/${student2SubmissionId}/reject`)
        .set("Authorization", `Bearer ${supervisor2Token}`)
        .send({ remarks: "    " });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    });

    it("should allow supervisor 2 to reject submission with mandatory remarks", async () => {
      const res = await request(app)
        .post(`/theses/${student2SubmissionId}/reject`)
        .set("Authorization", `Bearer ${supervisor2Token}`)
        .send({
          remarks: "Plagiarism detected in literature review section exceeding institutional threshold of 10%.",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, "REJECTED");

      const sub = await prisma.thesisSubmission.findUnique({
        where: { id: student2SubmissionId },
        include: { thesis: true },
      });
      assert.equal(sub?.status, "REJECTED");
      assert.equal(sub?.thesis.status, "CLOSED");
      assert.ok(sub?.closureReason?.includes("Plagiarism detected"));
    });

    it("should not allow resubmission against a rejected submission", async () => {
      const pdf = createPdfBuffer("Attempt to resubmit against rejected");
      const upRes = await request(app)
        .post("/theses/upload")
        .set("Authorization", `Bearer ${student2Token}`)
        .attach("file", pdf, "try_resubmit.pdf");

      const res = await request(app)
        .post("/theses/resubmit")
        .set("Authorization", `Bearer ${student2Token}`)
        .send({
          storageKey: upRes.body.file.storageKey,
          originalFilename: "try_resubmit.pdf",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "RESUBMISSION_NOT_PERMITTED");
    });
  });

  // ---------------------------------------------------------------------------
  // I. File Size Limits & Edge Cases
  // ---------------------------------------------------------------------------
  describe("I. File Size Limits & Edge Cases", () => {
    it("should reject uploads exceeding configured size limit with 413", async () => {
      // Create a dummy buffer header plus oversize padding
      const smallPdf = createPdfBuffer("Oversized payload");
      // Create a buffer larger than 20 MiB: 20 * 1024 * 1024 + 1024 bytes
      const bigBuffer = Buffer.alloc(20 * 1024 * 1024 + 1024);
      smallPdf.copy(bigBuffer, 0);

      const res = await request(app)
        .post("/theses/upload")
        .set("Authorization", `Bearer ${student1Token}`)
        .attach("file", bigBuffer, "too_large.pdf");

      assert.equal(res.status, 413);
      assert.equal(res.body.error.code, "FILE_TOO_LARGE");
    });
  });

  // ---------------------------------------------------------------------------
  // J. Multiple-Role Faculty Verification
  // ---------------------------------------------------------------------------
  describe("J. Single Account Holding Multiple Roles", () => {
    it("should correctly identify all active roles for faculty account (e.g. HOD has HOD and SUPERVISOR)", async () => {
      const meRes = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${hodToken}`);

      assert.equal(meRes.status, 200);
      const roleCodes = meRes.body.user.roles.map((r: any) => r.code);
      assert.ok(roleCodes.includes("HOD"));
      assert.ok(roleCodes.includes("SUPERVISOR"));
    });

    it("should enforce HOD download prohibition even when faculty member also holds supervisor role", async () => {
      // hod.cse is HOD of the scholar's department.
      // Even though hod.cse has SUPERVISOR role generally, they are NOT the assigned supervisor for student 1.
      // Therefore, in the context of this thesis, they cannot download.
      const res = await request(app)
        .get(`/theses/${submissionId}/file/download`)
        .set("Authorization", `Bearer ${hodToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, "DOWNLOAD_FORBIDDEN_FOR_ROLE");
    });
  });

  // ---------------------------------------------------------------------------
  // K. Audit Trail Verification
  // ---------------------------------------------------------------------------
  describe("K. Comprehensive Audit Trail Verification", () => {
    it("should have recorded audit events for submission, forwarding, and download attempts", async () => {
      const events = await prisma.auditEvent.findMany({
        where: {
          eventType: {
            in: [
              "thesis.submitted",
              "thesis.forwarded",
              "thesis.file_download",
              "thesis.file_downloaded",
              "thesis.returned_for_revision",
              "thesis.rejected",
              "thesis.final_approved",
            ],
          },
        },
      });

      assert.ok(events.length >= 5);
      const submittedEvent = events.find((e) => e.eventType === "thesis.submitted");
      assert.ok(submittedEvent);
      assert.equal(submittedEvent.outcome, "SUCCESS");

      const deniedDownload = events.find(
        (e) => e.eventType === "thesis.file_download" && e.outcome === "DENIED",
      );
      assert.ok(deniedDownload);
      assert.equal(deniedDownload.reason, "hod_download_prohibited");
    });
  });
});
