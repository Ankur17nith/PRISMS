import { z } from "zod";

export const draftMetadataSchema = z.object({
  workingTitle: z.string().trim().min(5, "Title must be at least 5 characters").max(300, "Title cannot exceed 300 characters"),
  abstract: z.string().trim().min(20, "Abstract must be at least 20 characters").max(5000, "Abstract cannot exceed 5000 characters").optional(),
  researchArea: z.string().trim().min(2, "Research area must be at least 2 characters").max(200, "Research area cannot exceed 200 characters").optional(),
});

export const submitThesisSchema = z.object({
  workingTitle: z.string().trim().min(5).max(300).optional(),
  abstract: z.string().trim().min(20).max(5000).optional(),
  researchArea: z.string().trim().min(2).max(200).optional(),
  storageKey: z.string().min(5).max(100).optional(),
  originalFilename: z.string().min(1).max(255).optional(),
});

export const resubmitThesisSchema = z.object({
  workingTitle: z.string().trim().min(5).max(300).optional(),
  abstract: z.string().trim().min(20).max(5000).optional(),
  researchArea: z.string().trim().min(2).max(200).optional(),
  storageKey: z.string().min(5).max(100),
  originalFilename: z.string().min(1).max(255),
  studentNote: z.string().trim().max(1000).optional(),
});

export const forwardReviewSchema = z.object({
  summary: z.string().trim().max(2000).optional(),
  recipientUserIds: z
    .array(z.string().uuid("Invalid recipient UUID"))
    .max(2, "At most two forwarding recipients are permitted")
    .default([]),
  activeRole: z.string().optional(),
});

export const returnReviewSchema = z.object({
  remarks: z
    .string()
    .trim()
    .min(5, "Mandatory return remarks must be at least 5 characters")
    .max(3000, "Remarks cannot exceed 3000 characters"),
  activeRole: z.string().optional(),
});

export const rejectReviewSchema = z.object({
  remarks: z
    .string()
    .trim()
    .min(5, "Mandatory rejection remarks must be at least 5 characters")
    .max(3000, "Remarks cannot exceed 3000 characters"),
  activeRole: z.string().optional(),
});

export const scholarQuerySchema = z.object({
  status: z.enum(["current", "completed", "all"]).default("all"),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
