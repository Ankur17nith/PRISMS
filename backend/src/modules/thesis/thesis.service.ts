import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { audit } from "../../lib/audit.js";
import { fileExists, getSecureFilePath, ValidatedPdf } from "../../lib/storage.js";
import type { AuthContext } from "../../middleware/auth.js";
import { ROLES, STAGE_CODES, hasNormalizedRole, normalizeRoleCode } from "./thesis.constants.js";
import type {
  draftMetadataSchema,
  forwardReviewSchema,
  rejectReviewSchema,
  resubmitThesisSchema,
  returnReviewSchema,
  scholarQuerySchema,
  submitThesisSchema,
} from "./thesis.schemas.js";
import type { z } from "zod";

type DraftInput = z.infer<typeof draftMetadataSchema>;
type SubmitInput = z.infer<typeof submitThesisSchema>;
type ResubmitInput = z.infer<typeof resubmitThesisSchema>;
type ForwardInput = z.infer<typeof forwardReviewSchema>;
type ReturnInput = z.infer<typeof returnReviewSchema>;
type RejectInput = z.infer<typeof rejectReviewSchema>;
type ScholarQuery = z.infer<typeof scholarQuerySchema>;

// -----------------------------------------------------------------------------
// Helpers & Resolvers
// -----------------------------------------------------------------------------

export async function getStudentByUserId(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, fullName: true, collegeEmail: true } },
      department: { select: { id: true, code: true, name: true } },
    },
  });
  if (!student) {
    throw new AppError(403, "You do not have a registered student profile", "NOT_A_STUDENT");
  }
  return student;
}

export async function getActiveSupervisorForStudent(studentId: string) {
  const now = new Date();
  const assignment = await prisma.studentSupervisorAssignment.findFirst({
    where: {
      studentId,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    include: {
      faculty: {
        include: {
          user: { select: { id: true, fullName: true, collegeEmail: true } },
          department: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
  if (!assignment) {
    throw new AppError(400, "No active supervisor is currently assigned to you", "NO_ACTIVE_SUPERVISOR");
  }
  return assignment;
}

export async function getOrCreateStageDefinition(code: string, name: string, sequenceNumber: number) {
  return await prisma.workflowStageDefinition.upsert({
    where: { code },
    update: { name, sequenceNumber },
    create: { code, name, sequenceNumber, isActive: true },
  });
}

// -----------------------------------------------------------------------------
// Student: Draft and Submission
// -----------------------------------------------------------------------------

export async function getStudentThesisDraft(userId: string) {
  const student = await getStudentByUserId(userId);
  const supervisor = await getActiveSupervisorForStudent(student.id);
  const thesis = await prisma.thesis.findUnique({
    where: { studentId: student.id },
    include: {
      submissions: {
        orderBy: { submissionNumber: "desc" },
        take: 1,
        include: {
          files: { where: { isPrimary: true }, take: 1 },
          stages: { include: { definition: true } },
        },
      },
    },
  });

  return {
    student: {
      id: student.id,
      rollNumber: student.rollNumber,
      program: student.program,
      department: student.department,
    },
    supervisor: {
      facultyId: supervisor.facultyId,
      userId: supervisor.faculty.user.id,
      name: supervisor.faculty.user.fullName,
      email: supervisor.faculty.user.collegeEmail,
    },
    thesis: thesis
      ? {
          id: thesis.id,
          workingTitle: thesis.workingTitle,
          abstract: thesis.abstract,
          researchArea: thesis.researchArea,
          status: thesis.status,
          latestSubmission: thesis.submissions[0]
            ? {
                ...thesis.submissions[0],
                files: thesis.submissions[0].files.map((f) => ({
                  ...f,
                  fileSizeBytes: Number(f.fileSizeBytes),
                })),
              }
            : null,
        }
      : null,
  };
}

export async function saveOrUpdateDraft(userId: string, input: DraftInput, req?: Request) {
  const student = await getStudentByUserId(userId);
  const thesis = await prisma.thesis.upsert({
    where: { studentId: student.id },
    update: {
      workingTitle: input.workingTitle,
      abstract: input.abstract ?? null,
      researchArea: input.researchArea ?? null,
    },
    create: {
      studentId: student.id,
      workingTitle: input.workingTitle,
      abstract: input.abstract ?? null,
      researchArea: input.researchArea ?? null,
      status: "IN_PROGRESS",
    },
  });

  await audit({
    actorUserId: userId,
    eventType: "thesis.draft_saved",
    entityType: "thesis",
    entityId: thesis.id,
    outcome: "SUCCESS",
    req,
  });

  return thesis;
}

export async function submitThesis(userId: string, input: SubmitInput, req?: Request) {
  const student = await getStudentByUserId(userId);
  const supervisorAssignment = await getActiveSupervisorForStudent(student.id);

  // Ensure thesis record exists and has valid title
  let thesis = await prisma.thesis.findUnique({ where: { studentId: student.id } });
  const title = input.workingTitle ?? thesis?.workingTitle;
  if (!title || title.trim().length < 5) {
    throw new AppError(400, "Working title is required (minimum 5 characters)", "TITLE_REQUIRED");
  }

  if (!thesis) {
    thesis = await prisma.thesis.create({
      data: {
        studentId: student.id,
        workingTitle: title,
        abstract: input.abstract ?? null,
        researchArea: input.researchArea ?? null,
        status: "IN_PROGRESS",
      },
    });
  } else {
    thesis = await prisma.thesis.update({
      where: { id: thesis.id },
      data: {
        workingTitle: title,
        abstract: input.abstract !== undefined ? input.abstract : thesis.abstract,
        researchArea: input.researchArea !== undefined ? input.researchArea : thesis.researchArea,
        status: "IN_PROGRESS",
      },
    });
  }

  // Prevent duplicate concurrent submissions
  const activeSubmission = await prisma.thesisSubmission.findFirst({
    where: {
      thesisId: thesis.id,
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
  });
  if (activeSubmission) {
    throw new AppError(
      409,
      "You already have an active thesis submission currently under review",
      "CONCURRENT_SUBMISSION_EXISTS",
    );
  }

  // File requirement check
  if (!input.storageKey) {
    throw new AppError(400, "Thesis PDF file upload is required for submission", "FILE_REQUIRED");
  }
  if (!fileExists(input.storageKey)) {
    throw new AppError(400, "Uploaded file not found in secure storage. Please upload again", "FILE_NOT_FOUND");
  }

  // Determine next submission version number
  const latestSubmission = await prisma.thesisSubmission.findFirst({
    where: { thesisId: thesis.id },
    orderBy: { submissionNumber: "desc" },
  });
  const nextNumber = (latestSubmission?.submissionNumber ?? 0) + 1;

  // Resolve Stage 1 (Supervisor Review) definition
  const supervisorStageDef = await getOrCreateStageDefinition(
    STAGE_CODES.SUPERVISOR_REVIEW,
    "Supervisor Review",
    1,
  );

  // Resolve Supervisor role
  const supervisorRole = await prisma.role.findFirst({
    where: { code: ROLES.SUPERVISOR },
  });

  const created = await prisma.$transaction(async (tx) => {
    // 1. Create submission
    const sub = await tx.thesisSubmission.create({
      data: {
        thesisId: thesis.id,
        submissionNumber: nextNumber,
        submittedByUserId: userId,
        status: "SUBMITTED",
      },
    });

    // 2. Link file with accurate byte size and sha256 checksum
    let fileSizeBytes = BigInt(0);
    let sha256Checksum: string | null = null;
    try {
      const filePath = getSecureFilePath(input.storageKey!);
      if (fs.existsSync(filePath)) {
        const fileBuf = fs.readFileSync(filePath);
        fileSizeBytes = BigInt(fileBuf.length);
        sha256Checksum = createHash("sha256").update(fileBuf).digest("hex");
      }
    } catch {
      // fallback
    }

    const file = await tx.thesisFile.create({
      data: {
        submissionId: sub.id,
        uploadedByUserId: userId,
        originalFilename: input.originalFilename ?? "thesis.pdf",
        storageKey: input.storageKey!,
        mimeType: "application/pdf",
        fileSizeBytes,
        sha256Checksum,
        scanStatus: "CLEAN",
        isPrimary: true,
      },
    });

    // 3. Create initial SubmissionStage
    const stage = await tx.submissionStage.create({
      data: {
        submissionId: sub.id,
        stageDefinitionId: supervisorStageDef.id,
        status: "PENDING",
        startedAt: new Date(),
      },
    });

    // 4. Create ReviewAssignment for the assigned supervisor
    await tx.reviewAssignment.create({
      data: {
        submissionStageId: stage.id,
        reviewerUserId: supervisorAssignment.faculty.user.id,
        reviewerRoleId: supervisorRole?.id ?? null,
        assignedByUserId: userId,
        assignmentStatus: "ASSIGNED",
        isRequired: true,
        assignmentNote: "Initial thesis submission forwarded for supervisor review",
      },
    });

    return { submission: sub, file, stage };
  });

  await audit({
    actorUserId: userId,
    eventType: "thesis.submitted",
    entityType: "thesis_submission",
    entityId: created.submission.id,
    outcome: "SUCCESS",
    metadata: {
      submissionNumber: nextNumber,
      supervisorUserId: supervisorAssignment.faculty.user.id,
    },
    req,
  });

  return {
    submissionId: created.submission.id,
    submissionNumber: created.submission.submissionNumber,
    status: created.submission.status,
    submittedAt: created.submission.submittedAt,
    fileId: created.file.id,
    currentStage: supervisorStageDef.name,
  };
}

export async function resubmitThesis(userId: string, input: ResubmitInput, req?: Request) {
  const student = await getStudentByUserId(userId);
  const supervisorAssignment = await getActiveSupervisorForStudent(student.id);

  const thesis = await prisma.thesis.findUnique({
    where: { studentId: student.id },
    include: {
      submissions: { orderBy: { submissionNumber: "desc" }, take: 1 },
    },
  });
  if (!thesis || thesis.submissions.length === 0) {
    throw new AppError(400, "No existing thesis submission found to revise", "NO_SUBMISSION_FOUND");
  }

  const latest = thesis.submissions[0]!;
  if (latest.status !== "REVISION_REQUIRED") {
    throw new AppError(
      400,
      `Resubmission is only permitted when revision is required. Current status: ${latest.status}`,
      "RESUBMISSION_NOT_PERMITTED",
    );
  }

  if (!fileExists(input.storageKey)) {
    throw new AppError(400, "Revised file not found in storage. Please re-upload", "FILE_NOT_FOUND");
  }

  const nextNumber = latest.submissionNumber + 1;
  const supervisorStageDef = await getOrCreateStageDefinition(
    STAGE_CODES.SUPERVISOR_REVIEW,
    "Supervisor Review",
    1,
  );
  const supervisorRole = await prisma.role.findFirst({ where: { code: ROLES.SUPERVISOR } });

  const created = await prisma.$transaction(async (tx) => {
    // 1. Create new submission version
    const sub = await tx.thesisSubmission.create({
      data: {
        thesisId: thesis.id,
        submissionNumber: nextNumber,
        submittedByUserId: userId,
        status: "SUBMITTED",
      },
    });

    // 2. Link newly uploaded revised file with accurate byte size and sha256 checksum
    let resubmitFileSizeBytes = BigInt(0);
    let resubmitSha256: string | null = null;
    try {
      const filePath = getSecureFilePath(input.storageKey);
      if (fs.existsSync(filePath)) {
        const fileBuf = fs.readFileSync(filePath);
        resubmitFileSizeBytes = BigInt(fileBuf.length);
        resubmitSha256 = createHash("sha256").update(fileBuf).digest("hex");
      }
    } catch {
      // fallback
    }

    const file = await tx.thesisFile.create({
      data: {
        submissionId: sub.id,
        uploadedByUserId: userId,
        originalFilename: input.originalFilename,
        storageKey: input.storageKey,
        mimeType: "application/pdf",
        fileSizeBytes: resubmitFileSizeBytes,
        sha256Checksum: resubmitSha256,
        scanStatus: "CLEAN",
        isPrimary: true,
      },
    });

    await tx.thesis.update({
      where: { id: thesis.id },
      data: { status: "IN_PROGRESS" },
    });

    // 3. Create Stage 1 again for Supervisor review
    const stage = await tx.submissionStage.create({
      data: {
        submissionId: sub.id,
        stageDefinitionId: supervisorStageDef.id,
        status: "PENDING",
        startedAt: new Date(),
      },
    });

    // 4. Create ReviewAssignment for supervisor
    await tx.reviewAssignment.create({
      data: {
        submissionStageId: stage.id,
        reviewerUserId: supervisorAssignment.faculty.user.id,
        reviewerRoleId: supervisorRole?.id ?? null,
        assignedByUserId: userId,
        assignmentStatus: "ASSIGNED",
        isRequired: true,
        assignmentNote: input.studentNote ?? "Revised thesis resubmitted by scholar",
      },
    });

    // 5. If scholar provided a revision note, record it
    if (input.studentNote) {
      await tx.reviewComment.create({
        data: {
          submissionId: sub.id,
          stageId: stage.id,
          authorUserId: userId,
          body: `Scholar revision remarks: ${input.studentNote}`,
        },
      });
    }

    return { submission: sub, file, stage };
  });

  await audit({
    actorUserId: userId,
    eventType: "thesis.resubmitted",
    entityType: "thesis_submission",
    entityId: created.submission.id,
    outcome: "SUCCESS",
    metadata: {
      previousSubmissionNumber: latest.submissionNumber,
      newSubmissionNumber: nextNumber,
    },
    req,
  });

  return {
    submissionId: created.submission.id,
    submissionNumber: created.submission.submissionNumber,
    status: created.submission.status,
    submittedAt: created.submission.submittedAt,
    fileId: created.file.id,
    currentStage: supervisorStageDef.name,
  };
}

// -----------------------------------------------------------------------------
// Queries: Student and Submission Details
// -----------------------------------------------------------------------------

export async function getStudentSubmissions(userId: string) {
  const student = await getStudentByUserId(userId);
  const thesis = await prisma.thesis.findUnique({
    where: { studentId: student.id },
    include: {
      submissions: {
        orderBy: { submissionNumber: "desc" },
        include: {
          files: { orderBy: { uploadedAt: "desc" } },
          stages: {
            include: {
              definition: true,
              assignments: {
                include: {
                  reviewer: { select: { fullName: true } },
                  reviewerRole: { select: { name: true, code: true } },
                  review: true,
                },
              },
            },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            include: { author: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  if (!thesis) return { thesis: null, submissions: [] };

  return {
    thesis: {
      id: thesis.id,
      workingTitle: thesis.workingTitle,
      abstract: thesis.abstract,
      researchArea: thesis.researchArea,
      status: thesis.status,
    },
    submissions: thesis.submissions.map((s) => ({
      id: s.id,
      submissionNumber: s.submissionNumber,
      submissionReference: `TH-${new Date(s.submittedAt).getFullYear()}-${String(s.submissionNumber).padStart(3, "0")}`,
      title: thesis.workingTitle,
      status: s.status,
      currentVersion: s.submissionNumber,
      submittedAt: s.submittedAt,
      closureReason: s.closureReason,
      files: s.files.map((f) => ({
        id: f.id,
        originalFilename: f.originalFilename,
        fileSizeBytes: f.fileSizeBytes.toString(),
        scanStatus: f.scanStatus,
        uploadedAt: f.uploadedAt,
      })),
      stages: s.stages.map((st) => ({
        id: st.id,
        stageName: st.definition.name,
        stageCode: st.definition.code,
        status: st.status,
        startedAt: st.startedAt,
        completedAt: st.completedAt,
        assignments: st.assignments.map((a) => ({
          id: a.id,
          reviewerRole: a.reviewerRole?.code ?? "REVIEWER",
          assignmentStatus: a.assignmentStatus,
          decision: a.review?.decision ?? null,
          decidedAt: a.review?.decidedAt ?? null,
        })),
      })),
      feedback: s.comments.map((c) => ({
        id: c.id,
        author: c.author.fullName,
        body: c.body,
        createdAt: c.createdAt,
      })),
    })),
  };
}

export async function getSubmissionDetail(submissionId: string, auth: AuthContext) {
  const submission = await prisma.thesisSubmission.findUnique({
    where: { id: submissionId },
    include: {
      thesis: {
        include: {
          student: {
            include: {
              user: { select: { id: true, fullName: true, collegeEmail: true } },
              department: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
      files: { orderBy: { uploadedAt: "desc" } },
      stages: {
        orderBy: { definition: { sequenceNumber: "asc" } },
        include: {
          definition: true,
          assignments: {
            include: {
              reviewer: { select: { id: true, fullName: true, collegeEmail: true } },
              reviewerRole: true,
              review: true,
            },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!submission) {
    throw new AppError(404, "Thesis submission not found", "SUBMISSION_NOT_FOUND");
  }

  // Authorization check
  const studentUserId = submission.thesis.student.userId;
  const isAuthor = auth.userId === studentUserId;
  const userRoles = auth.roles;
  const studentDeptId = submission.thesis.student.departmentId;

  const isAssignedSupervisor = await prisma.studentSupervisorAssignment.findFirst({
    where: {
      studentId: submission.thesis.studentId,
      faculty: { userId: auth.userId },
      startDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
  });

  const isReviewerOnSubmission = submission.stages.some((st) =>
    st.assignments.some((a) => a.reviewerUserId === auth.userId),
  );

  const isHodInDept = userRoles.some(
    (r) => normalizeRoleCode(r.code) === ROLES.HOD && r.departmentId === studentDeptId,
  );
  const isDdpcInDept = userRoles.some(
    (r) => normalizeRoleCode(r.code) === ROLES.DDPC && r.departmentId === studentDeptId,
  );
  const isInstituteAuthority = userRoles.some((r) =>
    [ROLES.CHAIRPERSON_SDPC, ROLES.DEAN_ACADEMICS, ROLES.CHAIRPERSON_SENATE, ROLES.ADMIN].includes(
      normalizeRoleCode(r.code) as any,
    ),
  );

  if (
    !isAuthor &&
    !isAssignedSupervisor &&
    !isReviewerOnSubmission &&
    !isHodInDept &&
    !isDdpcInDept &&
    !isInstituteAuthority
  ) {
    throw new AppError(403, "You are not authorized to view this submission", "FORBIDDEN");
  }

  return {
    submission: {
      id: submission.id,
      submissionNumber: submission.submissionNumber,
      submissionReference: `TH-2026-${submission.submissionNumber.toString().padStart(3, "0")}`,
      currentVersion: submission.submissionNumber,
      title: submission.thesis.workingTitle,
      status: submission.status,
      submittedAt: submission.submittedAt,
      closedAt: submission.closedAt,
      closureReason: submission.closureReason,
      thesis: {
        id: submission.thesis.id,
        workingTitle: submission.thesis.workingTitle,
        abstract: submission.thesis.abstract,
        researchArea: submission.thesis.researchArea,
      },
      scholar: {
        studentId: submission.thesis.student.id,
        rollNumber: submission.thesis.student.rollNumber,
        fullName: submission.thesis.student.user.fullName,
        email: submission.thesis.student.user.collegeEmail,
        collegeEmail: submission.thesis.student.user.collegeEmail,
        user: {
          id: submission.thesis.student.user.id,
          fullName: submission.thesis.student.user.fullName,
          collegeEmail: submission.thesis.student.user.collegeEmail,
        },
        department: submission.thesis.student.department,
      },
      student: {
        id: submission.thesis.student.id,
        rollNumber: submission.thesis.student.rollNumber,
        program: submission.thesis.student.program,
        user: {
          id: submission.thesis.student.user.id,
          fullName: submission.thesis.student.user.fullName,
          collegeEmail: submission.thesis.student.user.collegeEmail,
        },
        department: {
          id: submission.thesis.student.department.id,
          code: submission.thesis.student.department.code,
          name: submission.thesis.student.department.name,
        },
      },
      files: submission.files.map((f) => ({
        id: f.id,
        originalFilename: f.originalFilename,
        originalFileName: f.originalFilename,
        fileSizeBytes: Number(f.fileSizeBytes),
        sha256Checksum: f.sha256Checksum,
        scanStatus: f.scanStatus,
        uploadedAt: f.uploadedAt,
      })),
      stages: submission.stages.map((st) => ({
        id: st.id,
        stageName: st.definition.name,
        stageCode: st.definition.code,
        sequenceNumber: st.definition.sequenceNumber,
        status: st.status,
        startedAt: st.startedAt,
        completedAt: st.completedAt,
        assignments: st.assignments.map((a) => ({
          id: a.id,
          reviewerId: a.reviewerUserId,
          reviewerUserId: a.reviewerUserId,
          reviewerName: a.reviewer.fullName,
          reviewerRole: a.reviewerRole?.code ?? "REVIEWER",
          reviewer: {
            id: a.reviewer.id,
            fullName: a.reviewer.fullName,
            collegeEmail: a.reviewer.collegeEmail,
          },
          status: a.assignmentStatus,
          assignmentStatus: a.assignmentStatus,
          decision: a.review?.decision ?? null,
          decisionSummary: a.review?.summary ?? null,
          decidedAt: a.review?.decidedAt ?? null,
        })),
      })),
      comments: submission.comments.map((c) => ({
        id: c.id,
        authorId: c.authorUserId,
        authorName: c.author.fullName,
        body: c.body,
        createdAt: c.createdAt,
      })),
    },
  };
}

// -----------------------------------------------------------------------------
// Document Authorization (Inline View vs Download)
// -----------------------------------------------------------------------------

export async function authorizeDocumentAccess(
  submissionId: string,
  auth: AuthContext,
  action: "view" | "download",
  req?: Request,
  fileId?: string,
) {
  const submission = await prisma.thesisSubmission.findUnique({
    where: { id: submissionId },
    include: {
      thesis: { include: { student: true } },
      files: { orderBy: { uploadedAt: "desc" } },
      stages: { include: { definition: true, assignments: true } },
    },
  });

  if (!submission) {
    throw new AppError(404, "Thesis submission not found", "SUBMISSION_NOT_FOUND");
  }

  const targetFile = fileId
    ? submission.files.find((f) => f.id === fileId)
    : submission.files.find((f) => f.isPrimary) || submission.files[0];

  if (!targetFile) {
    throw new AppError(404, "No matching thesis file associated with this submission", "FILE_NOT_FOUND");
  }

  // Ensure file physically exists in private storage
  if (!fileExists(targetFile.storageKey)) {
    throw new AppError(404, "Thesis PDF document not found in secure institutional storage", "FILE_NOT_FOUND");
  }

  // Validate PDF magic bytes on disk
  const filePath = getSecureFilePath(targetFile.storageKey);
  const headBuf = Buffer.alloc(5);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, headBuf, 0, 5, 0);
  fs.closeSync(fd);
  if (!headBuf.toString("utf-8").startsWith("%PDF-")) {
    throw new AppError(400, "Corrupted thesis file: invalid PDF signature", "INVALID_FILE_SIGNATURE");
  }

  const studentDeptId = submission.thesis.student.departmentId;
  const isAuthor = auth.userId === submission.thesis.student.userId;
  const isAssignedSupervisor = await prisma.studentSupervisorAssignment.findFirst({
    where: {
      studentId: submission.thesis.studentId,
      faculty: { userId: auth.userId },
      startDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
  });
  const isReviewer = submission.stages.some((st) =>
    st.assignments.some((a) => a.reviewerUserId === auth.userId),
  );
  const isHod = auth.roles.some(
    (r) => normalizeRoleCode(r.code) === ROLES.HOD && r.departmentId === studentDeptId,
  );
  const isDdpc = auth.roles.some(
    (r) => normalizeRoleCode(r.code) === ROLES.DDPC && r.departmentId === studentDeptId,
  );
  const hasInstituteRole = auth.roles.some((r) =>
    [ROLES.CHAIRPERSON_SDPC, ROLES.DEAN_ACADEMICS, ROLES.CHAIRPERSON_SENATE, ROLES.ADMIN].includes(
      normalizeRoleCode(r.code) as any,
    ),
  );

  // 1. Basic View Access Check
  const canView = isAuthor || isAssignedSupervisor || isReviewer || isHod || isDdpc || hasInstituteRole;
  if (!canView) {
    await audit({
      actorUserId: auth.userId,
      eventType: "thesis.document_access",
      entityType: "thesis_file",
      entityId: targetFile.id,
      outcome: "DENIED",
      reason: "unauthorized_view",
      req,
    });
    throw new AppError(403, "You do not have permission to access this thesis document", "FORBIDDEN");
  }

  // 2. DOWNLOAD RESTRICTION (MANDATORY INSTITUTIONAL RULE)
  if (action === "download") {
    // Validate that if client claims to act under a specific role, they actually hold that role
    const activeRoleHeader = req?.headers["x-active-role"] as string | undefined;
    const activeRoleQuery = req?.query?.role as string | undefined;
    const requestedRole = activeRoleHeader || activeRoleQuery;
    if (requestedRole) {
      const hasClaimedRole = auth.roles.some(
        (r) => normalizeRoleCode(r.code) === normalizeRoleCode(requestedRole),
      );
      if (!hasClaimedRole) {
        throw new AppError(403, `User does not possess claimed role ${requestedRole}`, "ROLE_UNAUTHORIZED");
      }
    }

    // Check if the user is acting in HOD review mode or currently assigned to HOD review stage
    const isHodReviewAssignment = submission.stages.some(
      (st) =>
        st.definition?.code === "HOD_REVIEW" &&
        st.assignments.some(
          (a) =>
            a.reviewerUserId === auth.userId &&
            (a.assignmentStatus === "ASSIGNED" || a.assignmentStatus === "ACCEPTED"),
        ),
    );
    const isActingAsHod =
      normalizeRoleCode(activeRoleHeader || "") === ROLES.HOD ||
      normalizeRoleCode(activeRoleQuery || "") === ROLES.HOD ||
      isHodReviewAssignment;

    // Under NIT Hamirpur regulations, HOD review workflow or HOD role (unless also the assigned individual supervisor)
    // is strictly prohibited from downloading dissertation documents under all circumstances.
    if (isActingAsHod || (isHod && !isAssignedSupervisor && !isAuthor)) {
      await audit({
        actorUserId: auth.userId,
        eventType: "thesis.file_download",
        entityType: "thesis_file",
        entityId: targetFile.id,
        outcome: "DENIED",
        reason: "hod_download_prohibited",
        req,
      });
      throw new AppError(
        403,
        "HOD is not permitted to download thesis documents under any circumstances",
        "DOWNLOAD_FORBIDDEN_FOR_ROLE",
      );
    }

    // Non-HOD download permission check
    const canDownload = isAuthor || isAssignedSupervisor || isDdpc || hasInstituteRole;
    if (!canDownload) {
      await audit({
        actorUserId: auth.userId,
        eventType: "thesis.file_download",
        entityType: "thesis_file",
        entityId: targetFile.id,
        outcome: "DENIED",
        reason: "role_not_permitted_download",
        req,
      });
      throw new AppError(403, "You do not have permission to download this document", "FORBIDDEN");
    }
  }

  // Record authorized access audit event
  await audit({
    actorUserId: auth.userId,
    eventType: action === "view" ? "thesis.file_viewed" : "thesis.file_downloaded",
    entityType: "thesis_file",
    entityId: targetFile.id,
    outcome: "SUCCESS",
    metadata: { submissionId, originalFilename: targetFile.originalFilename },
    req,
  });

  return targetFile;
}

// -----------------------------------------------------------------------------
// Faculty: Review Queue and Recipient Resolution
// -----------------------------------------------------------------------------

export async function getFacultyReviewQueue(
  userId: string,
  userRoles: { code: string; departmentId: string | null }[],
  filter?: { role?: string; stage?: string },
) {
  // Find active assignments directly assigned to this faculty user
  const assignments = await prisma.reviewAssignment.findMany({
    where: {
      reviewerUserId: userId,
      assignmentStatus: { in: ["ASSIGNED", "ACCEPTED"] },
      stage: {
        status: "PENDING",
        submission: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      },
    },
    include: {
      reviewerRole: true,
      stage: {
        include: {
          definition: true,
          submission: {
            include: {
              thesis: {
                include: {
                  student: {
                    include: {
                      user: { select: { fullName: true, collegeEmail: true } },
                      department: { select: { code: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const tasks = assignments.map((a) => {
    const studentUser = a.stage.submission.thesis.student.user;
    const studentDept = a.stage.submission.thesis.student.department;
    return {
      assignmentId: a.id,
      submissionId: a.stage.submissionId,
      submissionNumber: a.stage.submission.submissionNumber,
      submittedAt: a.stage.submission.submittedAt,
      workingTitle: a.stage.submission.thesis.workingTitle,
      studentName: studentUser.fullName,
      rollNumber: a.stage.submission.thesis.student.rollNumber,
      departmentCode: studentDept.code,
      departmentName: studentDept.name,
      stageCode: a.stage.definition.code,
      stageName: a.stage.definition.name,
      assignedRole: a.reviewerRole?.code ?? "REVIEWER",
      assignedAt: a.assignedAt,
      status: a.stage.submission.status,
      submission: {
        id: a.stage.submissionId,
        submissionReference: `TH-2026-${String(a.stage.submission.submissionNumber).padStart(3, "0")}`,
        title: a.stage.submission.thesis.workingTitle,
        status: a.stage.submission.status,
        currentVersion: a.stage.submission.submissionNumber,
        submittedAt: a.stage.submission.submittedAt ? a.stage.submission.submittedAt.toISOString() : null,
        student: {
          rollNumber: a.stage.submission.thesis.student.rollNumber,
          program: a.stage.submission.thesis.student.program,
          user: {
            fullName: studentUser.fullName,
            collegeEmail: studentUser.collegeEmail,
          },
          department: {
            code: studentDept.code,
            name: studentDept.name,
          },
        },
      },
      stage: {
        code: a.stage.definition.code,
        name: a.stage.definition.name,
        sequenceOrder: a.stage.definition.sequenceNumber,
      },
    };
  });

  // Also include DDPC observer visibility for student submissions in DDPC's department
  const ddpcRole = userRoles.find((r) => normalizeRoleCode(r.code) === ROLES.DDPC);
  if (ddpcRole && ddpcRole.departmentId) {
    const ddpcSubmissions = await prisma.thesisSubmission.findMany({
      where: {
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
        thesis: { student: { departmentId: ddpcRole.departmentId } },
      },
      include: {
        thesis: {
          include: {
            student: {
              include: {
                user: { select: { fullName: true, collegeEmail: true } },
                department: { select: { code: true, name: true } },
              },
            },
          },
        },
        stages: {
          where: { status: "PENDING" },
          include: { definition: true },
          take: 1,
        },
      },
    });

    for (const sub of ddpcSubmissions) {
      if (!tasks.some((t) => t.submissionId === sub.id)) {
        const currentStage = sub.stages[0];
        tasks.push({
          assignmentId: `ddpc-observer-${sub.id}`,
          submissionId: sub.id,
          submissionNumber: sub.submissionNumber,
          submittedAt: sub.submittedAt,
          workingTitle: sub.thesis.workingTitle,
          studentName: sub.thesis.student.user.fullName,
          rollNumber: sub.thesis.student.rollNumber,
          departmentCode: sub.thesis.student.department.code,
          departmentName: sub.thesis.student.department.name,
          stageCode: currentStage?.definition.code ?? "PENDING",
          stageName: currentStage?.definition.name ?? "Pending Review",
          assignedRole: ROLES.DDPC,
          assignedAt: sub.submittedAt,
          status: sub.status,
          submission: {
            id: sub.id,
            submissionReference: `TH-2026-${String(sub.submissionNumber).padStart(3, "0")}`,
            title: sub.thesis.workingTitle,
            status: sub.status,
            currentVersion: sub.submissionNumber,
            submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
            student: {
              rollNumber: sub.thesis.student.rollNumber,
              program: sub.thesis.student.program,
              user: {
                fullName: sub.thesis.student.user.fullName,
                collegeEmail: sub.thesis.student.user.collegeEmail,
              },
              department: {
                code: sub.thesis.student.department.code,
                name: sub.thesis.student.department.name,
              },
            },
          },
          stage: {
            code: currentStage?.definition.code ?? "PENDING",
            name: currentStage?.definition.name ?? "Pending Review",
            sequenceOrder: currentStage?.definition.sequenceNumber ?? 2,
          },
        });
      }
    }
  }

  // Filter if requested
  return tasks.filter((t) => {
    if (filter?.role && normalizeRoleCode(t.assignedRole) !== normalizeRoleCode(filter.role)) {
      return false;
    }
    if (filter?.stage && t.stageCode !== filter.stage) {
      return false;
    }
    return true;
  });
}

function deduplicateRecipients<T extends { userId: string; roleCode: string; roleName: string }>(list: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of list) {
    const existing = map.get(item.userId);
    if (!existing) {
      map.set(item.userId, item);
    } else if (
      item.roleCode === ROLES.CHAIRPERSON_SDPC ||
      item.roleCode === ROLES.DEAN_ACADEMICS ||
      item.roleCode === ROLES.CHAIRPERSON_SENATE
    ) {
      map.set(item.userId, item);
    }
  }
  return Array.from(map.values());
}

export async function getAuthorizedRecipients(submissionId: string, userId: string, role?: string) {
  const submission = await prisma.thesisSubmission.findUnique({
    where: { id: submissionId },
    include: {
      thesis: { include: { student: true } },
      stages: {
        where: { status: "PENDING" },
        include: { definition: true, assignments: true },
      },
    },
  });

  if (!submission) {
    throw new AppError(404, "Thesis submission not found", "SUBMISSION_NOT_FOUND");
  }

  const currentStage = submission.stages[0];
  if (!currentStage) {
    return {
      isActionable: false,
      currentStage: "Completed",
      targetStage: null,
      allowedSelection: "none",
      recipients: [],
      eligibleRecipients: [],
    };
  }

  // Verify that requester is assigned reviewer for this active stage
  const assignment = currentStage.assignments.find((a) => a.reviewerUserId === userId);
  if (!assignment) {
    throw new AppError(403, "You are not the assigned reviewer for the current stage", "FORBIDDEN");
  }

  const studentDeptId = submission.thesis.student.departmentId;
  const now = new Date();

  // STAGE A / B -> SUPERVISOR forwards to HOD (strictly of the scholar's department)
  if (currentStage.definition.code === STAGE_CODES.SUPERVISOR_REVIEW) {
    const hodRoles = await prisma.userRole.findMany({
      where: {
        role: { code: ROLES.HOD, isActive: true },
        departmentId: studentDeptId,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: {
        user: { select: { id: true, fullName: true, collegeEmail: true } },
        department: { select: { name: true, code: true } },
        role: true,
      },
    });

    const mapped = deduplicateRecipients(
      hodRoles.map((r) => ({
        userId: r.user.id,
        fullName: r.user.fullName,
        email: r.user.collegeEmail,
        collegeEmail: r.user.collegeEmail,
        roleCode: ROLES.HOD,
        roleName: r.role.name,
        designation: r.role.name,
        departmentName: r.department?.name ?? null,
      })),
    );

    return {
      isActionable: true,
      currentStage: currentStage.definition.name,
      targetStage: "Head of Department Review",
      allowedSelection: "single",
      recipients: mapped,
      eligibleRecipients: mapped,
    };
  }

  // STAGE C -> HOD forwards to Chairperson SDPC, Dean Academics, or BOTH
  if (currentStage.definition.code === STAGE_CODES.HOD_REVIEW) {
    const targetRoles = await prisma.userRole.findMany({
      where: {
        role: {
          code: { in: [ROLES.CHAIRPERSON_SDPC, ROLES.SDPC, ROLES.DEAN_ACADEMICS, ROLES.DEAN] },
          isActive: true,
        },
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: {
        user: { select: { id: true, fullName: true, collegeEmail: true } },
        department: { select: { name: true, code: true } },
        role: true,
      },
    });

    const mapped = deduplicateRecipients(
      targetRoles.map((r) => ({
        userId: r.user.id,
        fullName: r.user.fullName,
        email: r.user.collegeEmail,
        collegeEmail: r.user.collegeEmail,
        roleCode: normalizeRoleCode(r.role.code),
        roleName: r.role.name,
        designation: r.role.name,
        departmentName: r.department?.name ?? null,
      })),
    );

    return {
      isActionable: true,
      currentStage: currentStage.definition.name,
      targetStage: "SDPC & Dean Review",
      allowedSelection: "single_or_both",
      recipients: mapped,
      eligibleRecipients: mapped,
    };
  }

  // STAGE D -> SDPC forwards to Chairperson Senate
  if (
    currentStage.definition.code === STAGE_CODES.SDPC_REVIEW ||
    currentStage.definition.code === STAGE_CODES.DEAN_REVIEW
  ) {
    const senateRoles = await prisma.userRole.findMany({
      where: {
        role: {
          code: { in: [ROLES.CHAIRPERSON_SENATE, ROLES.CHAIRMAN] },
          isActive: true,
        },
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: {
        user: { select: { id: true, fullName: true, collegeEmail: true } },
        role: true,
      },
    });

    const mapped = deduplicateRecipients(
      senateRoles.map((r) => ({
        userId: r.user.id,
        fullName: r.user.fullName,
        email: r.user.collegeEmail,
        collegeEmail: r.user.collegeEmail,
        roleCode: ROLES.CHAIRPERSON_SENATE,
        roleName: r.role.name,
        designation: r.role.name,
        departmentName: "Institute-wide",
      })),
    );

    return {
      isActionable: true,
      currentStage: currentStage.definition.name,
      targetStage: "Senate Review & Final Approval",
      allowedSelection: "single",
      recipients: mapped,
      eligibleRecipients: mapped,
    };
  }

  return {
    isActionable: true,
    currentStage: currentStage.definition.name,
    targetStage: null,
    allowedSelection: "final_decision",
    recipients: [],
    eligibleRecipients: [],
  };
}

// -----------------------------------------------------------------------------
// Workflow Transitions: Forward, Return, Reject
// -----------------------------------------------------------------------------

export async function forwardSubmission(
  submissionId: string,
  userId: string,
  input: ForwardInput,
  req?: Request,
) {
  const submission = await prisma.thesisSubmission.findUnique({
    where: { id: submissionId },
    include: {
      thesis: { include: { student: true } },
      stages: {
        where: { status: "PENDING" },
        include: { definition: true, assignments: true },
      },
    },
  });

  if (!submission) {
    throw new AppError(404, "Thesis submission not found", "SUBMISSION_NOT_FOUND");
  }
  if (!["SUBMITTED", "IN_REVIEW"].includes(submission.status)) {
    throw new AppError(400, `Cannot forward submission with status ${submission.status}`, "INVALID_STATUS");
  }

  const currentStage = submission.stages[0];
  if (!currentStage) {
    throw new AppError(400, "No pending workflow stage found for this submission", "NO_ACTIVE_STAGE");
  }

  // Re-verify that user has active assignment on this stage
  const assignment = currentStage.assignments.find((a) => a.reviewerUserId === userId);
  if (!assignment) {
    throw new AppError(403, "You are not the assigned reviewer for this active stage", "FORBIDDEN");
  }

  // Revalidate recipient set against authorized list
  const authorized = await getAuthorizedRecipients(submissionId, userId);
  const authorizedUserIds = authorized.recipients.map((r) => r.userId);

  // If this is the final authority stage (Senate Review)
  if (currentStage.definition.code === STAGE_CODES.SENATE_REVIEW) {
    // Senate final approval
    await prisma.$transaction(async (tx) => {
      // Complete review assignment
      await tx.reviewAssignment.update({
        where: { id: assignment.id },
        data: { assignmentStatus: "COMPLETED", completedAt: new Date() },
      });
      await tx.review.create({
        data: {
          reviewAssignmentId: assignment.id,
          decision: "APPROVE",
          summary: input.summary ?? "Final approval granted by Chairperson Senate",
        },
      });
      // Complete stage
      await tx.submissionStage.update({
        where: { id: currentStage.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      // Finalize submission and thesis
      await tx.thesisSubmission.update({
        where: { id: submission.id },
        data: { status: "APPROVED", closedAt: new Date(), closureReason: "Approved by Chairperson Senate" },
      });
      await tx.thesis.update({
        where: { id: submission.thesisId },
        data: { status: "CLOSED" },
      });
      if (input.summary) {
        await tx.reviewComment.create({
          data: {
            submissionId: submission.id,
            stageId: currentStage.id,
            reviewAssignmentId: assignment.id,
            authorUserId: userId,
            body: input.summary,
          },
        });
      }
    });

    await audit({
      actorUserId: userId,
      eventType: "thesis.final_approved",
      entityType: "thesis_submission",
      entityId: submission.id,
      outcome: "SUCCESS",
      req,
    });

    return { status: "APPROVED", message: "Thesis final approval recorded successfully" };
  }

  // Validate non-empty recipient list for forwarding stages
  if (!input.recipientUserIds || input.recipientUserIds.length === 0) {
    throw new AppError(400, "At least one forwarding recipient is required for this stage", "RECIPIENT_REQUIRED");
  }

  // Canonical deduplication of target recipients
  const distinctRecipientUserIds = Array.from(new Set(input.recipientUserIds));

  for (const recipientId of distinctRecipientUserIds) {
    if (!authorizedUserIds.includes(recipientId)) {
      throw new AppError(
        400,
        `Recipient ID ${recipientId} is not an authorized recipient for this stage`,
        "UNAUTHORIZED_RECIPIENT",
      );
    }
  }

  // Execute transition according to current stage
  await prisma.$transaction(async (tx) => {
    // 1. Complete current assignment
    await tx.reviewAssignment.update({
      where: { id: assignment.id },
      data: { assignmentStatus: "COMPLETED", completedAt: new Date() },
    });
    await tx.review.create({
      data: {
        reviewAssignmentId: assignment.id,
        decision: "APPROVE",
        summary: input.summary ?? "Approved and forwarded to next stage",
      },
    });

    // 2. Complete current stage
    await tx.submissionStage.update({
      where: { id: currentStage.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // 3. Create next stage(s) & assignments
    if (currentStage.definition.code === STAGE_CODES.SUPERVISOR_REVIEW) {
      // Forward to HOD
      const hodStageDef = await getOrCreateStageDefinition(STAGE_CODES.HOD_REVIEW, "HOD Review", 2);
      const hodRole = await tx.role.findFirst({ where: { code: ROLES.HOD } });
      const nextStage = await tx.submissionStage.create({
        data: {
          submissionId: submission.id,
          stageDefinitionId: hodStageDef.id,
          status: "PENDING",
          startedAt: new Date(),
        },
      });
      await tx.reviewAssignment.create({
        data: {
          submissionStageId: nextStage.id,
          reviewerUserId: distinctRecipientUserIds[0]!,
          reviewerRoleId: hodRole?.id ?? null,
          assignedByUserId: userId,
          assignmentStatus: "ASSIGNED",
          isRequired: true,
          assignmentNote: "Forwarded by Supervisor",
        },
      });
      await tx.thesisSubmission.update({
        where: { id: submission.id },
        data: { status: "IN_REVIEW" },
      });
    } else if (currentStage.definition.code === STAGE_CODES.HOD_REVIEW) {
      // Forward to SDPC and/or Dean Academics
      for (const recId of distinctRecipientUserIds) {
        const recipientMeta = authorized.recipients.find((r) => r.userId === recId);
        const isSdpc = recipientMeta?.roleCode === ROLES.CHAIRPERSON_SDPC;
        const targetCode = isSdpc ? STAGE_CODES.SDPC_REVIEW : STAGE_CODES.DEAN_REVIEW;
        const targetName = isSdpc ? "SDPC Chairperson Review" : "Dean Academics Review";

        const stageDef = await getOrCreateStageDefinition(targetCode, targetName, 3);
        const role = await tx.role.findFirst({
          where: { code: isSdpc ? ROLES.CHAIRPERSON_SDPC : ROLES.DEAN_ACADEMICS },
        });

        const stage = await tx.submissionStage.create({
          data: {
            submissionId: submission.id,
            stageDefinitionId: stageDef.id,
            status: "PENDING",
            startedAt: new Date(),
          },
        });
        await tx.reviewAssignment.create({
          data: {
            submissionStageId: stage.id,
            reviewerUserId: recId,
            reviewerRoleId: role?.id ?? null,
            assignedByUserId: userId,
            assignmentStatus: "ASSIGNED",
            isRequired: true,
            assignmentNote: "Forwarded by HOD",
          },
        });
      }
    } else if (
      currentStage.definition.code === STAGE_CODES.SDPC_REVIEW ||
      currentStage.definition.code === STAGE_CODES.DEAN_REVIEW
    ) {
      // Check if there are other parallel review stages at Stage 3 (SDPC / Dean) still PENDING
      const parallelOtherPending = await tx.submissionStage.findFirst({
        where: {
          submissionId: submission.id,
          id: { not: currentStage.id },
          status: "PENDING",
          definition: {
            code: { in: [STAGE_CODES.SDPC_REVIEW, STAGE_CODES.DEAN_REVIEW] },
          },
        },
      });

      if (!parallelOtherPending) {
        // All parallel review branches are completed: advance to Senate Review
        const existingSenateStage = await tx.submissionStage.findFirst({
          where: {
            submissionId: submission.id,
            definition: { code: STAGE_CODES.SENATE_REVIEW },
          },
        });

        if (!existingSenateStage) {
          const senateStageDef = await getOrCreateStageDefinition(
            STAGE_CODES.SENATE_REVIEW,
            "Senate Chairperson Review",
            4,
          );
          const senateRole = await tx.role.findFirst({
            where: { code: { in: [ROLES.CHAIRPERSON_SENATE, ROLES.CHAIRMAN] } },
          });
          const stage = await tx.submissionStage.create({
            data: {
              submissionId: submission.id,
              stageDefinitionId: senateStageDef.id,
              status: "PENDING",
              startedAt: new Date(),
            },
          });
          await tx.reviewAssignment.create({
            data: {
              submissionStageId: stage.id,
              reviewerUserId: distinctRecipientUserIds[0]!,
              reviewerRoleId: senateRole?.id ?? null,
              assignedByUserId: userId,
              assignmentStatus: "ASSIGNED",
              isRequired: true,
              assignmentNote: "Forwarded for final Senate decision",
            },
          });
        }
      }
    }

    if (input.summary) {
      await tx.reviewComment.create({
        data: {
          submissionId: submission.id,
          stageId: currentStage.id,
          reviewAssignmentId: assignment.id,
          authorUserId: userId,
          body: input.summary,
        },
      });
    }
  });

  await audit({
    actorUserId: userId,
    eventType: "thesis.forwarded",
    entityType: "thesis_submission",
    entityId: submission.id,
    outcome: "SUCCESS",
    metadata: {
      fromStage: currentStage.definition.code,
      recipients: input.recipientUserIds.join(","),
    },
    req,
  });

  return { status: "FORWARDED", message: "Thesis submission successfully forwarded to next stage" };
}

export async function returnSubmission(
  submissionId: string,
  userId: string,
  input: ReturnInput,
  req?: Request,
) {
  const submission = await prisma.thesisSubmission.findUnique({
    where: { id: submissionId },
    include: {
      stages: {
        where: { status: "PENDING" },
        include: { assignments: true, definition: true },
      },
    },
  });

  if (!submission) {
    throw new AppError(404, "Thesis submission not found", "SUBMISSION_NOT_FOUND");
  }
  if (!["SUBMITTED", "IN_REVIEW"].includes(submission.status)) {
    throw new AppError(400, `Cannot return submission with status ${submission.status}`, "INVALID_STATUS");
  }

  const currentStage = submission.stages[0];
  if (!currentStage) {
    throw new AppError(400, "No pending workflow stage found for this submission", "NO_ACTIVE_STAGE");
  }

  const assignment = currentStage.assignments.find((a) => a.reviewerUserId === userId);
  if (!assignment) {
    throw new AppError(403, "You are not an assigned reviewer on this stage", "FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Mark reviewer's assignment as completed with decision REJECT (return for revision)
    await tx.reviewAssignment.update({
      where: { id: assignment.id },
      data: { assignmentStatus: "COMPLETED", completedAt: new Date() },
    });
    await tx.review.create({
      data: {
        reviewAssignmentId: assignment.id,
        decision: "REJECT",
        summary: `Returned to scholar for revision: ${input.remarks}`,
      },
    });

    // 2. Cancel any other active assignments on pending stages for this submission
    await tx.reviewAssignment.updateMany({
      where: {
        stage: { submissionId: submission.id, status: "PENDING" },
        assignmentStatus: { in: ["ASSIGNED", "ACCEPTED"] },
        id: { not: assignment.id },
      },
      data: { assignmentStatus: "CANCELLED", completedAt: new Date() },
    });

    // 3. Mark current and any pending stages as COMPLETED / CANCELLED
    await tx.submissionStage.updateMany({
      where: { submissionId: submission.id, status: "PENDING" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // 4. Update submission status to REVISION_REQUIRED
    await tx.thesisSubmission.update({
      where: { id: submission.id },
      data: { status: "REVISION_REQUIRED", closureReason: input.remarks },
    });

    // 5. Record mandatory remarks as ReviewComment for the student to read
    await tx.reviewComment.create({
      data: {
        submissionId: submission.id,
        stageId: currentStage.id,
        reviewAssignmentId: assignment.id,
        authorUserId: userId,
        body: `[REVISION REQUIRED] ${input.remarks}`,
      },
    });
  });

  await audit({
    actorUserId: userId,
    eventType: "thesis.returned_for_revision",
    entityType: "thesis_submission",
    entityId: submission.id,
    outcome: "SUCCESS",
    metadata: { stage: currentStage.definition.code, remarks: input.remarks },
    req,
  });

  return { status: "REVISION_REQUIRED", message: "Thesis returned to scholar for revision" };
}

export async function rejectSubmission(
  submissionId: string,
  userId: string,
  input: RejectInput,
  req?: Request,
) {
  const submission = await prisma.thesisSubmission.findUnique({
    where: { id: submissionId },
    include: {
      stages: {
        where: { status: "PENDING" },
        include: { assignments: true, definition: true },
      },
    },
  });

  if (!submission) {
    throw new AppError(404, "Thesis submission not found", "SUBMISSION_NOT_FOUND");
  }

  const currentStage = submission.stages[0];
  if (!currentStage) {
    throw new AppError(400, "No pending workflow stage found for this submission", "NO_ACTIVE_STAGE");
  }

  const assignment = currentStage.assignments.find((a) => a.reviewerUserId === userId);
  if (!assignment) {
    throw new AppError(403, "You are not an assigned reviewer on this stage", "FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Complete reviewer assignment with decision REJECT
    await tx.reviewAssignment.update({
      where: { id: assignment.id },
      data: { assignmentStatus: "COMPLETED", completedAt: new Date() },
    });
    await tx.review.create({
      data: {
        reviewAssignmentId: assignment.id,
        decision: "REJECT",
        summary: `Rejected: ${input.remarks}`,
      },
    });

    // 2. Cancel all other active assignments
    await tx.reviewAssignment.updateMany({
      where: {
        stage: { submissionId: submission.id, status: "PENDING" },
        assignmentStatus: { in: ["ASSIGNED", "ACCEPTED"] },
        id: { not: assignment.id },
      },
      data: { assignmentStatus: "CANCELLED", completedAt: new Date() },
    });

    // 3. Complete pending stages
    await tx.submissionStage.updateMany({
      where: { submissionId: submission.id, status: "PENDING" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // 4. Update submission and thesis status to REJECTED / CLOSED
    await tx.thesisSubmission.update({
      where: { id: submission.id },
      data: { status: "REJECTED", closedAt: new Date(), closureReason: input.remarks },
    });
    await tx.thesis.update({
      where: { id: submission.thesisId },
      data: { status: "CLOSED" },
    });

    // 5. Record mandatory remarks
    await tx.reviewComment.create({
      data: {
        submissionId: submission.id,
        stageId: currentStage.id,
        reviewAssignmentId: assignment.id,
        authorUserId: userId,
        body: `[FINAL REJECTION] ${input.remarks}`,
      },
    });
  });

  await audit({
    actorUserId: userId,
    eventType: "thesis.rejected",
    entityType: "thesis_submission",
    entityId: submission.id,
    outcome: "SUCCESS",
    metadata: { stage: currentStage.definition.code, remarks: input.remarks },
    req,
  });

  return { status: "REJECTED", message: "Thesis submission rejected" };
}

// -----------------------------------------------------------------------------
// Supervisor: Scholar Tracking API
// -----------------------------------------------------------------------------

export async function getSupervisorScholars(
  userId: string,
  query: ScholarQuery,
  actingRole?: string,
) {
  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    include: { department: true },
  });
  if (!faculty) {
    throw new AppError(403, "You do not have a registered faculty profile", "NOT_FACULTY");
  }

  const isHod = normalizeRoleCode(actingRole || "") === ROLES.HOD;
  const now = new Date();

  if (isHod) {
    const studentWhere: any = { departmentId: faculty.departmentId };
    if (query.status === "current") {
      studentWhere.admissionStatus = { in: ["CONFIRMED", "ACTIVE", "Active"] };
    } else if (query.status === "completed") {
      studentWhere.admissionStatus = "COMPLETED";
    }

    if (query.search) {
      studentWhere.OR = [
        { rollNumber: { contains: query.search, mode: "insensitive" } },
        { user: { fullName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.student.count({ where: studentWhere });
    const students = await prisma.student.findMany({
      where: studentWhere,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { rollNumber: "asc" },
      include: {
        user: { select: { fullName: true, collegeEmail: true } },
        department: { select: { code: true, name: true } },
        thesis: {
          include: {
            submissions: {
              orderBy: { submissionNumber: "desc" },
              take: 1,
              include: {
                stages: {
                  where: { status: "PENDING" },
                  include: { definition: true },
                  take: 1,
                },
              },
            },
          },
        },
        supervisorAssignments: {
          where: {
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gt: now } }],
          },
          include: { faculty: { include: { user: { select: { fullName: true } } } } },
          take: 1,
        },
      },
    });

    const scholars = students.map((s) => {
      const latestSub = s.thesis?.submissions[0];
      const currentPendingStage = latestSub?.stages[0];
      const supervisorName = s.supervisorAssignments[0]?.faculty.user.fullName ?? "Unassigned";

      return {
        scholarId: s.id,
        studentId: s.id,
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        email: s.user.collegeEmail,
        collegeEmail: s.user.collegeEmail,
        program: s.program,
        admissionStatus: s.admissionStatus,
        departmentCode: s.department.code,
        departmentName: s.department.name,
        supervisionStatus: "CURRENT",
        supervisorName,
        activeSubmission: latestSub
          ? {
              id: latestSub.id,
              submissionReference: `TH-2026-${String(latestSub.submissionNumber).padStart(3, "0")}`,
              title: s.thesis?.workingTitle ?? "Doctoral Thesis",
              status: latestSub.status,
              currentVersion: latestSub.submissionNumber,
              submittedAt: latestSub.submittedAt ? latestSub.submittedAt.toISOString() : null,
              currentStage: currentPendingStage?.definition.name ?? null,
            }
          : null,
      };
    });

    return {
      scholars,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  const whereClause: any = { facultyId: faculty.id };

  if (query.status === "current") {
    whereClause.startDate = { lte: now };
    whereClause.OR = [{ endDate: null }, { endDate: { gt: now } }];
  } else if (query.status === "completed") {
    whereClause.endDate = { lte: now };
  }

  if (query.search) {
    whereClause.student = {
      OR: [
        { rollNumber: { contains: query.search, mode: "insensitive" } },
        { user: { fullName: { contains: query.search, mode: "insensitive" } } },
      ],
    };
  }

  const total = await prisma.studentSupervisorAssignment.count({ where: whereClause });
  const assignments = await prisma.studentSupervisorAssignment.findMany({
    where: whereClause,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    orderBy: { startDate: "desc" },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, collegeEmail: true } },
          department: { select: { code: true, name: true } },
          thesis: {
            include: {
              submissions: {
                orderBy: { submissionNumber: "desc" },
                take: 1,
                include: {
                  stages: {
                    where: { status: "PENDING" },
                    include: { definition: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const scholars = assignments.map((a) => {
    const latestSub = a.student.thesis?.submissions[0];
    const currentPendingStage = latestSub?.stages[0];
    const isSupervisionActive = !a.endDate || a.endDate > now;

    return {
      scholarId: a.studentId,
      studentId: a.studentId,
      rollNumber: a.student.rollNumber,
      fullName: a.student.user.fullName,
      email: a.student.user.collegeEmail,
      collegeEmail: a.student.user.collegeEmail,
      program: a.student.program,
      admissionStatus: isSupervisionActive ? "Active" : "Completed",
      departmentCode: a.student.department.code,
      departmentName: a.student.department.name,
      supervisionStatus: isSupervisionActive ? "CURRENT" : "COMPLETED",
      supervisionStartDate: a.startDate,
      supervisionEndDate: a.endDate,
      activeSubmission: latestSub
        ? {
            id: latestSub.id,
            submissionReference: `TH-2026-${latestSub.submissionNumber.toString().padStart(3, "0")}`,
            title: a.student.thesis?.workingTitle ?? "Doctoral Dissertation",
            status: latestSub.status,
            currentVersion: latestSub.submissionNumber,
            submittedAt: latestSub.submittedAt ? latestSub.submittedAt.toISOString() : null,
            currentStage: currentPendingStage?.definition.name ?? null,
          }
        : null,
      thesis: a.student.thesis
        ? {
            id: a.student.thesis.id,
            workingTitle: a.student.thesis.workingTitle,
            researchArea: a.student.thesis.researchArea,
            status: a.student.thesis.status,
            latestSubmissionNumber: latestSub?.submissionNumber ?? null,
            latestSubmissionStatus: latestSub?.status ?? null,
            latestSubmittedAt: latestSub?.submittedAt ?? null,
            currentPendingStage: currentPendingStage?.definition.name ?? null,
          }
        : null,
    };
  });

  return {
    scholars,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getSupervisorScholarHistory(
  supervisorUserId: string,
  studentId: string,
  actingRole?: string,
) {
  const faculty = await prisma.faculty.findUnique({
    where: { userId: supervisorUserId },
    include: { department: true },
  });
  if (!faculty) {
    throw new AppError(403, "You do not have a registered faculty profile", "NOT_FACULTY");
  }

  const isHod = normalizeRoleCode(actingRole || "") === ROLES.HOD;

  // Verify that this faculty supervises (or supervised) this scholar OR is HOD of the department
  const assignment = await prisma.studentSupervisorAssignment.findFirst({
    where: { facultyId: faculty.id, studentId },
    include: {
      student: {
        include: {
          user: { select: { id: true, fullName: true, collegeEmail: true } },
          department: { select: { code: true, name: true } },
        },
      },
    },
  });

  const student = assignment
    ? assignment.student
    : await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { id: true, fullName: true, collegeEmail: true } },
          department: { select: { code: true, name: true } },
        },
      });

  if (!assignment && (!isHod || student?.departmentId !== faculty.departmentId)) {
    throw new AppError(403, "You are not authorized to view this scholar's supervision history", "FORBIDDEN");
  }

  if (!student) {
    throw new AppError(404, "Scholar record not found", "SCHOLAR_NOT_FOUND");
  }

  const thesis = await prisma.thesis.findUnique({
    where: { studentId },
    include: {
      submissions: {
        orderBy: { submissionNumber: "desc" },
        include: {
          files: { orderBy: { uploadedAt: "desc" } },
          stages: {
            include: {
              definition: true,
              assignments: {
                include: {
                  reviewer: { select: { fullName: true } },
                  reviewerRole: true,
                  review: true,
                },
              },
            },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            include: { author: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  const submissionsList = thesis
    ? thesis.submissions.map((s) => ({
        id: s.id,
        submissionNumber: s.submissionNumber,
        submissionReference: `TH-2026-${s.submissionNumber.toString().padStart(3, "0")}`,
        currentVersion: s.submissionNumber,
        title: thesis.workingTitle,
        status: s.status,
        submittedAt: s.submittedAt,
        closedAt: s.closedAt,
        closureReason: s.closureReason,
        files: s.files.map((f) => ({
          id: f.id,
          originalFilename: f.originalFilename,
          originalFileName: f.originalFilename,
          fileSizeBytes: Number(f.fileSizeBytes),
          scanStatus: f.scanStatus,
          uploadedAt: f.uploadedAt,
        })),
        stages: s.stages.map((st) => ({
          id: st.id,
          stageName: st.definition.name,
          stageCode: st.definition.code,
          status: st.status,
          startedAt: st.startedAt,
          completedAt: st.completedAt,
          assignments: st.assignments.map((a) => ({
            id: a.id,
            reviewerName: a.reviewer.fullName,
            reviewerRole: a.reviewerRole?.code ?? "REVIEWER",
            status: a.assignmentStatus,
            decision: a.review?.decision ?? null,
            decisionSummary: a.review?.summary ?? null,
            decidedAt: a.review?.decidedAt ?? null,
          })),
        })),
        feedback: s.comments.map((c) => ({
          id: c.id,
          author: c.author.fullName,
          body: c.body,
          createdAt: c.createdAt,
        })),
      }))
    : [];

  return {
    scholar: {
      studentId: student.id,
      scholarId: student.id,
      rollNumber: student.rollNumber,
      fullName: student.user.fullName,
      email: student.user.collegeEmail,
      collegeEmail: student.user.collegeEmail,
      user: {
        id: student.user.id,
        fullName: student.user.fullName,
        collegeEmail: student.user.collegeEmail,
      },
      program: student.program,
      department: student.department,
      supervisionStartDate: assignment?.startDate ?? null,
      supervisionEndDate: assignment?.endDate ?? null,
    },
    thesis: thesis
      ? {
          id: thesis.id,
          workingTitle: thesis.workingTitle,
          abstract: thesis.abstract,
          researchArea: thesis.researchArea,
          status: thesis.status,
          submissions: submissionsList,
        }
      : null,
    submissions: submissionsList,
  };
}
