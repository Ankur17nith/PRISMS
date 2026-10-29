import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { audit } from "../../lib/audit.js";
import { sendMail } from "../../lib/mailer.js";
import type { Prisma } from "../../generated/prisma/client";
import {
  clearAuthCookies,
  newOpaqueToken,
  setAuthCookies,
  sha256,
  signAccessToken,
} from "./auth.tokens.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const VERIFY_TTL_HOURS = 24;
const RESET_TTL_HOURS = 1;

const minutes = (n: number) => n * 60_000;
const hours = (n: number) => n * 3_600_000;
const days = (n: number) => n * 86_400_000;

const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: unknown }).code === "P2002";

// Used so that unknown emails cost the same time as a wrong password.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= argon2.hash("not-a-real-password"));

async function createSession(
  db: Prisma.TransactionClient,
  userId: string,
  familyId: string,
  req: Request,
) {
  const refreshToken = newOpaqueToken();
  await db.session.create({
    data: {
      userId,
      familyId,
      tokenHash: sha256(refreshToken),
      userAgent: req.get("user-agent")?.slice(0, 255) ?? null,
      ipAddress: req.ip ?? null,
      expiresAt: new Date(Date.now() + days(env.REFRESH_TOKEN_TTL_DAYS)),
    },
  });
  return refreshToken;
}

async function revokeFamily(familyId: string, reason: string) {
  await prisma.session.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

async function issueUserToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", ttlMs: number) {
  await prisma.userToken.deleteMany({ where: { userId, type, usedAt: null } });
  const token = newOpaqueToken();
  await prisma.userToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function sendVerificationEmail(userId: string, email: string) {
  const token = await issueUserToken(userId, "EMAIL_VERIFICATION", hours(VERIFY_TTL_HOURS));
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendMail({
    to: email,
    subject: "Verify your PRISMS account",
    text: `Open this link to verify your email (valid ${VERIFY_TTL_HOURS} hours):\n\n${link}\n\nToken: ${token}`,
  });
}

// ---------------------------------------------------------------- signup

export async function signup(input: { email: string; password: string; fullName: string }, req: Request) {
  if (env.ALLOWED_EMAIL_DOMAIN && !input.email.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN.toLowerCase()}`)) {
    throw new AppError(400, "Please use your institute email address", "EMAIL_DOMAIN_NOT_ALLOWED");
  }

  const existing = await prisma.user.findUnique({ where: { collegeEmail: input.email } });
  if (existing) {
    // Respond exactly as for a new signup so emails cannot be enumerated.
    await audit({ eventType: "auth.signup", outcome: "DENIED", reason: "email_exists", req, metadata: { email: input.email } });
    return;
  }

  const passwordHash = await argon2.hash(input.password);
  try {
    const user = await prisma.user.create({
      data: { collegeEmail: input.email, passwordHash, fullName: input.fullName, accountStatus: "PENDING" },
    });
    await sendVerificationEmail(user.id, user.collegeEmail);
    await audit({ actorUserId: user.id, eventType: "auth.signup", outcome: "SUCCESS", req });
  } catch (error) {
    if (isUniqueViolation(error)) return; // lost a race with a concurrent signup
    throw error;
  }
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findFirst({ where: { collegeEmail: email, deletedAt: null, accountStatus: "PENDING" } });
  if (user) await sendVerificationEmail(user.id, user.collegeEmail);
}

export async function verifyEmail(token: string, req: Request) {
  const record = await prisma.userToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "EMAIL_VERIFICATION" || record.usedAt || record.expiresAt <= new Date()) {
    throw new AppError(400, "Invalid or expired verification link", "INVALID_TOKEN");
  }
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.userToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) throw new AppError(400, "Invalid or expired verification link", "INVALID_TOKEN");
    await tx.user.updateMany({
      where: { id: record.userId, accountStatus: "PENDING" },
      data: { accountStatus: "ACTIVE", emailVerifiedAt: new Date() },
    });
  });
  await audit({ actorUserId: record.userId, eventType: "auth.verify_email", outcome: "SUCCESS", req });
}

// ----------------------------------------------------------------- login

export async function login(email: string, password: string, req: Request, res: Response) {
  const user = await prisma.user.findFirst({ where: { collegeEmail: email, deletedAt: null } });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await audit({ actorUserId: user.id, eventType: "auth.login", outcome: "DENIED", reason: "locked", req });
    throw new AppError(429, "Too many failed attempts. Try again later.", "ACCOUNT_LOCKED");
  }

  const hash = user?.passwordHash ?? (await getDummyHash());
  const passwordOk = await argon2.verify(hash, password).catch(() => false);

  if (!user || !user.passwordHash || !passwordOk) {
    if (user) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
        select: { failedLoginCount: true },
      });
      if (updated.failedLoginCount >= MAX_FAILED_LOGINS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + minutes(LOCK_MINUTES)) },
        });
      }
    }
    await audit({
      actorUserId: user?.id ?? null,
      eventType: "auth.login",
      outcome: "FAILURE",
      reason: user ? "bad_password" : "unknown_email",
      req,
      metadata: user ? undefined : { email },
    });
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  // Only reveal account state once the password was correct.
  if (user.accountStatus === "PENDING") {
    throw new AppError(403, "Please verify your email first", "EMAIL_NOT_VERIFIED");
  }
  if (user.accountStatus !== "ACTIVE") {
    await audit({ actorUserId: user.id, eventType: "auth.login", outcome: "DENIED", reason: `status_${user.accountStatus}`, req });
    throw new AppError(403, "This account is not active", "ACCOUNT_INACTIVE");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const refreshToken = await createSession(prisma, user.id, randomUUID(), req);
  setAuthCookies(res, signAccessToken(user.id), refreshToken);
  await audit({ actorUserId: user.id, eventType: "auth.login", outcome: "SUCCESS", req });

  return { id: user.id, email: user.collegeEmail, fullName: user.fullName, mustChangePassword: user.mustChangePassword };
}

// --------------------------------------------------------------- refresh

export async function refresh(req: Request, res: Response) {
  const fail = (): never => {
    clearAuthCookies(res);
    throw new AppError(401, "Session expired. Please log in again.", "SESSION_INVALID");
  };

  const raw = req.cookies?.refresh_token as string | undefined;
  if (!raw) return fail();

  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!session) return fail();

  if (session.revokedAt) {
    // A rotated/revoked token came back: assume theft and kill the whole login.
    await revokeFamily(session.familyId, "reuse_detected");
    await audit({ actorUserId: session.userId, eventType: "auth.refresh", outcome: "DENIED", reason: "token_reuse", req });
    return fail();
  }
  if (session.expiresAt <= new Date()) return fail();

  const user = await prisma.user.findFirst({ where: { id: session.userId, deletedAt: null, accountStatus: "ACTIVE" } });
  if (!user) {
    await revokeFamily(session.familyId, "user_inactive");
    return fail();
  }

  const nextRefresh = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: now, revokedReason: "rotated", lastUsedAt: now },
    });
    if (claimed.count === 0) return null; // someone else already used this token
    return createSession(tx, user.id, session.familyId, req);
  });
  if (!nextRefresh) {
    await revokeFamily(session.familyId, "reuse_detected");
    return fail();
  }

  setAuthCookies(res, signAccessToken(user.id), nextRefresh);
}

// ---------------------------------------------------------------- logout

export async function logout(req: Request, res: Response) {
  const raw = req.cookies?.refresh_token as string | undefined;
  if (raw) {
    await prisma.session.updateMany({
      where: { tokenHash: sha256(raw), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "logout" },
    });
  }
  clearAuthCookies(res);
}

export async function logoutAll(userId: string, req: Request, res: Response) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: "logout_all" },
  });
  clearAuthCookies(res);
  await audit({ actorUserId: userId, eventType: "auth.logout_all", outcome: "SUCCESS", req });
}

// -------------------------------------------------------- password reset

export async function forgotPassword(email: string, req: Request) {
  const user = await prisma.user.findFirst({ where: { collegeEmail: email, deletedAt: null, accountStatus: "ACTIVE" } });
  if (!user) return;
  const token = await issueUserToken(user.id, "PASSWORD_RESET", hours(RESET_TTL_HOURS));
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendMail({
    to: user.collegeEmail,
    subject: "Reset your PRISMS password",
    text: `Open this link to choose a new password (valid ${RESET_TTL_HOURS} hour):\n\n${link}\n\nToken: ${token}\n\nIf you did not ask for this, ignore this email.`,
  });
  await audit({ actorUserId: user.id, eventType: "auth.password_reset_requested", outcome: "SUCCESS", req });
}

export async function resetPassword(token: string, password: string, req: Request) {
  const record = await prisma.userToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt <= new Date()) {
    throw new AppError(400, "Invalid or expired reset link", "INVALID_TOKEN");
  }
  const passwordHash = await argon2.hash(password);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.userToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) throw new AppError(400, "Invalid or expired reset link", "INVALID_TOKEN");
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null, mustChangePassword: false },
    });
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "password_reset" },
    });
  });
  await audit({ actorUserId: record.userId, eventType: "auth.password_reset", outcome: "SUCCESS", req });
}

// -------------------------------------------------------------------- me

export const CANONICAL_ROLE_NAMES: Record<string, string> = {
  CHAIRPERSON_SDPC: "SDPC Chairperson",
  SDPC: "SDPC Chairperson",
  DEAN_ACADEMICS: "Dean of Academic Affairs",
  DEAN: "Dean of Academic Affairs",
  CHAIRPERSON_SENATE: "Chairperson Senate / Director",
  CHAIRMAN: "Chairperson Senate / Director",
  HOD: "Head of Department",
  SUPERVISOR: "Thesis Supervisor",
  DDPC: "Departmental Doctoral Programme Committee Convenor",
  STUDENT: "Doctoral Student / Scholar",
  ADMIN: "System Administrator",
};

export function normalizeRoleCode(code: string): string {
  const upper = (code || "").trim().toUpperCase();
  if (upper === "CHAIRMAN") return "CHAIRPERSON_SENATE";
  if (upper === "SDPC") return "CHAIRPERSON_SDPC";
  if (upper === "DEAN") return "DEAN_ACADEMICS";
  return upper;
}

export async function getActiveRoles(userId: string) {
  const now = new Date();
  const rows = await prisma.userRole.findMany({
    where: { userId, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
    include: { role: { select: { code: true, name: true, isActive: true } }, department: { select: { id: true, code: true } } },
  });

  const seen = new Set<string>();
  const deduped: Array<{
    id?: string;
    code: string;
    name: string;
    departmentId: string | null;
    departmentCode: string | null;
  }> = [];

  for (const r of rows) {
    if (!r.role.isActive) continue;
    const canonicalCode = normalizeRoleCode(r.role.code);
    const deptKey = r.department?.id ?? "INSTITUTE";
    const dedupKey = `${canonicalCode}_${deptKey}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    deduped.push({
      id: r.id,
      code: canonicalCode,
      name: CANONICAL_ROLE_NAMES[canonicalCode] || r.role.name,
      departmentId: r.department?.id ?? null,
      departmentCode: r.department?.code ?? null,
    });
  }

  return deduped;
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      collegeEmail: true,
      fullName: true,
      phone: true,
      accountStatus: true,
      mustChangePassword: true,
      studentProfile: {
        select: {
          id: true,
          rollNumber: true,
          program: true,
          admissionStatus: true,
          departmentId: true,
          department: { select: { id: true, code: true, name: true } },
        },
      },
      facultyProfile: {
        select: {
          id: true,
          employeeNumber: true,
          designation: true,
          departmentId: true,
          department: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
  return { ...user, roles: await getActiveRoles(userId) };
}
