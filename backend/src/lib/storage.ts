import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { AppError } from "./errors.js";

const getStorageDir = () => path.resolve(process.cwd(), env.THESIS_STORAGE_PATH);

/** Ensure private storage directory exists. */
export function ensureStorageDir(): void {
  const dir = getStorageDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export type ValidatedPdf = {
  originalFilename: string;
  storageKey: string;
  fileSizeBytes: bigint;
  sha256Checksum: string;
  mimeType: string;
};

/**
 * Validates PDF buffer signature, non-emptiness, and size limit.
 * Saves the file into private storage using an opaque identifier.
 */
export async function savePrivateThesisPdf(
  originalFilename: string,
  buffer: Buffer,
): Promise<ValidatedPdf> {
  ensureStorageDir();

  if (!buffer || buffer.length === 0) {
    throw new AppError(400, "Uploaded thesis file is empty", "FILE_EMPTY");
  }

  const maxBytes = env.MAX_THESIS_FILE_SIZE_BYTES;
  if (buffer.length > maxBytes) {
    const mbLimit = Math.round(maxBytes / (1024 * 1024));
    throw new AppError(
      413,
      `File size exceeds the maximum limit of ${mbLimit} MiB`,
      "FILE_TOO_LARGE",
    );
  }

  // Verify magic bytes: PDF signature "%PDF-" (0x25 0x50 0x44 0x46 0x2D)
  const header = buffer.subarray(0, 5).toString("utf-8");
  if (!header.startsWith("%PDF-")) {
    throw new AppError(
      400,
      "Invalid file signature. Only authentic PDF documents are permitted",
      "INVALID_FILE_SIGNATURE",
    );
  }

  const sha256Checksum = createHash("sha256").update(buffer).digest("hex");
  const storageKey = `${randomUUID()}.pdf`;
  const targetPath = getSecureFilePath(storageKey);

  try {
    await fs.promises.writeFile(targetPath, buffer);
  } catch (err) {
    console.error("Failed to write thesis file to private storage:", err);
    throw new AppError(500, "Failed to store thesis file securely", "STORAGE_WRITE_FAILED");
  }

  return {
    originalFilename: sanitizeFilename(originalFilename),
    storageKey,
    fileSizeBytes: BigInt(buffer.length),
    sha256Checksum,
    mimeType: "application/pdf",
  };
}

/** Resolves and validates that the file path stays strictly within the private storage directory. */
export function getSecureFilePath(storageKey: string): string {
  const dir = getStorageDir();
  // Storage key must be a pure filename (UUID + .pdf), prevent path traversal
  const safeName = path.basename(storageKey);
  if (safeName !== storageKey || storageKey.includes("..") || storageKey.includes("/") || storageKey.includes("\\")) {
    throw new AppError(400, "Invalid storage key format", "INVALID_STORAGE_KEY");
  }
  const resolved = path.resolve(dir, safeName);
  if (!resolved.startsWith(dir)) {
    throw new AppError(403, "Access denied: storage path traversal detected", "PATH_TRAVERSAL");
  }
  return resolved;
}

/** Check if a stored file exists on disk. */
export function fileExists(storageKey: string): boolean {
  try {
    const filePath = getSecureFilePath(storageKey);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/** Get the size in bytes of a stored file. */
export function getSecureFileSize(storageKey: string): number {
  const filePath = getSecureFilePath(storageKey);
  if (!fs.existsSync(filePath)) {
    throw new AppError(404, "Requested thesis file not found in storage", "FILE_NOT_FOUND");
  }
  const stat = fs.statSync(filePath);
  return stat.size;
}

/** Create a readable stream from a secure storage key with optional byte range options. */
export function createSecureReadStream(
  storageKey: string,
  options?: { start?: number; end?: number },
): Readable {
  const filePath = getSecureFilePath(storageKey);
  if (!fs.existsSync(filePath)) {
    throw new AppError(404, "Requested thesis file not found in storage", "FILE_NOT_FOUND");
  }
  return fs.createReadStream(filePath, options);
}

/** Asynchronously remove an abandoned or failed storage file. */
export async function deleteSecureFile(storageKey: string): Promise<void> {
  try {
    const filePath = getSecureFilePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn(`Compensating file cleanup failed for key: ${storageKey}`, err);
  }
}

/** Sanitizes original filenames to prevent header injection and path issues. */
function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.endsWith(".pdf") ? base : `${base}.pdf`;
}
