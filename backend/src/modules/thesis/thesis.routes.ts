import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createSecureReadStream, savePrivateThesisPdf } from "../../lib/storage.js";
import {
  draftMetadataSchema,
  forwardReviewSchema,
  rejectReviewSchema,
  resubmitThesisSchema,
  returnReviewSchema,
  scholarQuerySchema,
  submitThesisSchema,
} from "./thesis.schemas.js";
import * as service from "./thesis.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_THESIS_FILE_SIZE_BYTES,
    files: 1,
  },
});

const param = (p: string | string[] | undefined): string => (Array.isArray(p) ? p[0] ?? "" : p ?? "");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uuidParam = (p: string | string[] | undefined, name = "resource"): string => {
  const val = param(p);
  if (!val || !UUID_REGEX.test(val)) {
    throw new AppError(404, `Invalid ${name} identifier or resource not found`, "RESOURCE_NOT_FOUND");
  }
  return val;
};

const router = Router();

// =============================================================================
// Student Endpoints
// =============================================================================

// Get current thesis draft metadata and scholar info
router.get("/draft", requireAuth, async (req, res) => {
  const result = await service.getStudentThesisDraft(req.auth!.userId);
  res.json(result);
});

// Create or update thesis draft metadata
router.put("/draft", requireAuth, validate(draftMetadataSchema), async (req, res) => {
  const thesis = await service.saveOrUpdateDraft(req.auth!.userId, req.body, req);
  res.json({ thesis });
});

// Upload thesis PDF into private storage
router.post(
  "/upload",
  requireAuth,
  (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          const limitMb = Math.round(env.MAX_THESIS_FILE_SIZE_BYTES / (1024 * 1024));
          return res.status(413).json({
            error: {
              message: `Uploaded file exceeds maximum allowed limit of ${limitMb} MiB`,
              code: "FILE_TOO_LARGE",
            },
          });
        }
        return res.status(400).json({
          error: { message: `File upload error: ${err.message}`, code: "UPLOAD_ERROR" },
        });
      } else if (err) {
        return next(err);
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      throw new AppError(400, "No thesis PDF file provided in request", "FILE_MISSING");
    }
    const validated = await savePrivateThesisPdf(req.file.originalname, req.file.buffer);
    res.status(201).json({
      file: {
        storageKey: validated.storageKey,
        originalFilename: validated.originalFilename,
        fileSizeBytes: validated.fileSizeBytes.toString(),
        sha256Checksum: validated.sha256Checksum,
        mimeType: validated.mimeType,
      },
    });
  },
);

// Submit thesis draft for review
router.post("/submit", requireAuth, validate(submitThesisSchema), async (req, res) => {
  const result = await service.submitThesis(req.auth!.userId, req.body, req);
  res.status(201).json(result);
});

// Resubmit a revised thesis following return for revision
router.post("/resubmit", requireAuth, validate(resubmitThesisSchema), async (req, res) => {
  const result = await service.resubmitThesis(req.auth!.userId, req.body, req);
  res.status(201).json(result);
});

// List student's own submissions and feedback
router.get("/my", requireAuth, async (req, res) => {
  const result = await service.getStudentSubmissions(req.auth!.userId);
  res.json(result);
});

// =============================================================================
// Faculty Queue & Review Endpoints
// =============================================================================

// Get combined faculty review queue across active roles
router.get("/queue", requireAuth, async (req, res) => {
  const filter = {
    role: typeof req.query.role === "string" ? req.query.role : undefined,
    stage: typeof req.query.stage === "string" ? req.query.stage : undefined,
  };
  const tasks = await service.getFacultyReviewQueue(req.auth!.userId, req.auth!.roles, filter);
  res.json({ tasks });
});

// Get authorized forwarding recipients for current stage (supports both /recipients and /eligible-recipients)
router.get(
  ["/:submissionId/recipients", "/:submissionId/eligible-recipients"],
  requireAuth,
  async (req, res) => {
    const recipients = await service.getAuthorizedRecipients(
      uuidParam(req.params.submissionId, "submission"),
      req.auth!.userId,
      typeof req.query.role === "string" ? req.query.role : undefined,
    );
    res.json(recipients);
  },
);

// Forward thesis to next stage / recipients
router.post(
  "/:submissionId/forward",
  requireAuth,
  validate(forwardReviewSchema),
  async (req, res) => {
    const result = await service.forwardSubmission(uuidParam(req.params.submissionId, "submission"), req.auth!.userId, req.body, req);
    res.json(result);
  },
);

// Return thesis to student for mandatory revision
router.post(
  "/:submissionId/return",
  requireAuth,
  validate(returnReviewSchema),
  async (req, res) => {
    const result = await service.returnSubmission(uuidParam(req.params.submissionId, "submission"), req.auth!.userId, req.body, req);
    res.json(result);
  },
);

// Reject thesis submission
router.post(
  "/:submissionId/reject",
  requireAuth,
  validate(rejectReviewSchema),
  async (req, res) => {
    const result = await service.rejectSubmission(uuidParam(req.params.submissionId, "submission"), req.auth!.userId, req.body, req);
    res.json(result);
  },
);

// =============================================================================
// Document Viewing & Download Endpoints
// =============================================================================

// Inline in-portal PDF viewer stream (authenticated, no public URLs)
router.get("/:submissionId/file/view", requireAuth, async (req, res) => {
  const file = await service.authorizeDocumentAccess(
    uuidParam(req.params.submissionId, "submission"),
    req.auth!,
    "view",
    req,
    req.query.fileId as string | undefined,
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${file.originalFilename}"`);
  res.setHeader("Cache-Control", "private, no-store, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const stream = createSecureReadStream(file.storageKey);
  stream.on("error", (err) => {
    console.error("Stream error during inline viewing:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: "Failed to stream document", code: "STREAM_ERROR" } });
    }
  });
  stream.pipe(res);
});

// Dedicated document download (HOD strictly prohibited!)
router.get("/:submissionId/file/download", requireAuth, async (req, res) => {
  const file = await service.authorizeDocumentAccess(
    uuidParam(req.params.submissionId, "submission"),
    req.auth!,
    "download",
    req,
    req.query.fileId as string | undefined,
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${file.originalFilename}"`);
  res.setHeader("Cache-Control", "private, no-store, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const stream = createSecureReadStream(file.storageKey);
  stream.on("error", (err) => {
    console.error("Stream error during download:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: "Failed to download document", code: "STREAM_ERROR" } });
    }
  });
  stream.pipe(res);
});

// =============================================================================
// Supervisor Scholar Tracking Endpoints
// =============================================================================

// List current and completed scholars for Supervisor or HOD
router.get("/supervisor/scholars", requireAuth, async (req, res) => {
  const parsed = scholarQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters", "VALIDATION_ERROR");
  }
  const result = await service.getSupervisorScholars(
    req.auth!.userId,
    parsed.data,
    typeof req.query.role === "string" ? req.query.role : undefined,
  );
  res.json(result);
});

// Get detailed submission and version history for a specific supervised or departmental scholar
router.get("/supervisor/scholars/:studentId", requireAuth, async (req, res) => {
  const result = await service.getSupervisorScholarHistory(
    req.auth!.userId,
    uuidParam(req.params.studentId, "scholar"),
    typeof req.query.role === "string" ? req.query.role : undefined,
  );
  res.json(result);
});

// =============================================================================
// General Submission Detail Endpoint
// =============================================================================

router.get("/:submissionId", requireAuth, async (req, res) => {
  const result = await service.getSubmissionDetail(uuidParam(req.params.submissionId, "submission"), req.auth!);
  res.json(result);
});

export default router;
