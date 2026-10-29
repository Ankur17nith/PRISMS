/**
 * PRISMS Status & Formatting Helpers
 * Safe, defensive formatters for thesis submission statuses and workflow badges.
 */

import { SubmissionItem } from "./api";

/**
 * Format raw enum/string statuses safely without throwing undefined errors.
 * Example: 'REVISION_REQUIRED' -> 'REVISION REQUIRED'
 */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status || typeof status !== "string") {
    return "SUBMITTED";
  }
  return status.replace(/_/g, " ").trim();
}

/**
 * Return CSS color badge classes matching Figma design tokens
 */
export function getStatusBadgeClasses(status: string | null | undefined): string {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "APPROVED":
      return "bg-[#edf8ef] text-[#166534]";
    case "REVISION_REQUIRED":
    case "UNDER_REVIEW":
    case "PENDING":
    case "SUPERVISOR_REVIEW":
    case "HOD_REVIEW":
    case "SDPC_REVIEW":
      return "bg-[#fff7e6] text-[#8a570d]";
    case "REJECTED":
      return "bg-[#fff1ef] text-[#b42318]";
    case "SUBMITTED":
    case "INITIAL":
      return "bg-[#eff6ff] text-[#1e40af]";
    default:
      return "bg-[#f2f2f0] text-[#4b5563]";
  }
}

/**
 * Type guard to check if an object is a valid SubmissionItem
 */
export function isValidSubmission(item: unknown): item is SubmissionItem {
  if (!item || typeof item !== "object") return false;
  const s = item as Partial<SubmissionItem>;
  return typeof s.id === "string" && s.id.length > 0;
}

/**
 * Deep normalization for thesis submission items returned from API
 */
export function normalizeSubmission(raw: any): SubmissionItem {
  if (!raw) {
    return {
      id: "unknown",
      submissionReference: "TH-2026-000",
      title: "Doctoral Thesis",
      status: "SUBMITTED",
      currentVersion: 1,
      submittedAt: new Date().toISOString(),
      student: {
        rollNumber: "N/A",
        program: "PhD",
        user: { fullName: "Research Scholar", collegeEmail: "" },
        department: { code: "CSE", name: "Computer Science and Engineering" },
      },
      stages: [],
      files: [],
    };
  }

  const sub = raw.submission || raw;
  const subNum = Number(sub.submissionNumber || sub.currentVersion || 1);
  const submittedYear = sub.submittedAt ? new Date(sub.submittedAt).getFullYear() : 2026;
  const defaultRef = `TH-${submittedYear}-${String(subNum).padStart(3, "0")}`;

  const studentUser = sub.student?.user || sub.scholar?.user || sub.student || sub.scholar || {};
  const studentDept = sub.student?.department || sub.scholar?.department || sub.department || {};

  return {
    id: sub.id || "sub-" + Date.now(),
    submissionReference: sub.submissionReference || defaultRef,
    title: sub.title || sub.workingTitle || sub.thesis?.workingTitle || "Doctoral Thesis",
    status: sub.status || "SUBMITTED",
    currentVersion: subNum,
    submittedAt: sub.submittedAt || null,
    student: {
      rollNumber: sub.student?.rollNumber || sub.scholar?.rollNumber || "21PHDCSE01",
      program: sub.student?.program || sub.scholar?.program || "PhD Computer Science & Engineering",
      user: {
        fullName: studentUser.fullName || sub.scholar?.fullName || sub.studentName || "Research Scholar",
        collegeEmail: studentUser.collegeEmail || sub.scholar?.collegeEmail || sub.scholar?.email || "",
      },
      department: {
        code: studentDept.code || "CSE",
        name: studentDept.name || "Computer Science and Engineering",
      },
    },
    stages: Array.isArray(sub.stages)
      ? sub.stages.map((st: any, idx: number) => ({
          id: st.id || `stage-${idx}`,
          sequenceOrder: st.sequenceOrder || idx + 1,
          status: st.status || "PENDING",
          stageDefinition: st.stageDefinition || {
            code: st.stageCode || "REVIEW",
            name: st.stageName || "Academic Review",
          },
          assignments: Array.isArray(st.assignments)
            ? st.assignments.map((a: any) => {
                const revId = a.reviewer?.id || a.reviewerId || a.reviewerUserId || "";
                const revName = a.reviewer?.fullName || a.reviewerName || a.reviewerRole || "Reviewer";
                const revEmail = a.reviewer?.collegeEmail || a.reviewerEmail || "";
                return {
                  id: a.id || `assign-${Date.now()}`,
                  status: a.assignmentStatus || a.status || "PENDING",
                  reviewerId: revId,
                  reviewerUserId: revId,
                  reviewerRole: a.reviewerRole || "",
                  reviewerName: revName,
                  reviewer: {
                    id: revId,
                    fullName: revName,
                    collegeEmail: revEmail,
                  },
                };
              })
            : [],
        }))
      : [],
    files: Array.isArray(sub.files)
      ? sub.files.map((f: any) => ({
          id: f.id || `file-${Date.now()}`,
          originalFileName: f.originalFileName || f.originalFilename || "thesis_document.pdf",
          fileSizeBytes: Number(f.fileSizeBytes || 0),
          scanStatus: f.scanStatus || "CLEAN",
          sha256Checksum: f.sha256Checksum,
          createdAt: f.createdAt || f.uploadedAt || new Date().toISOString(),
        }))
      : [],
    decisions: Array.isArray(sub.decisions)
      ? sub.decisions.map((d: any) => ({
          id: d.id || `dec-${Date.now()}`,
          decision: d.decision,
          remarks: d.remarks || d.summary || null,
          createdAt: d.createdAt || d.decidedAt || new Date().toISOString(),
          reviewer: {
            id: d.reviewer?.id || d.reviewerUserId || "",
            fullName: d.reviewer?.fullName || d.reviewerName || "Reviewer",
          },
        }))
      : [],
    comments: Array.isArray(sub.comments || sub.feedback)
      ? (sub.comments || sub.feedback).map((c: any) => ({
          id: c.id || `comment-${Date.now()}`,
          commentText: c.commentText || c.body || "",
          author: {
            id: c.author?.id || c.authorId || "",
            fullName: c.author?.fullName || c.authorName || c.author || "Reviewer",
          },
          createdAt: c.createdAt || new Date().toISOString(),
        }))
      : [],
  };
}

/**
 * Persisted server timestamp formatter in Indian Standard Time (IST).
 * Returns formatted date and time with 'IST' suffix, e.g. "29 Oct 2026, 09:31 PM IST".
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return (
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(d) + " IST"
    );
  } catch {
    return "N/A";
  }
}

/**
 * Formatter for date-only display in IST (e.g., "29 Oct 2026").
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "N/A";
  }
}

