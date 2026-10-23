import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { audit } from "../lib/audit.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";
import { getActiveRoles } from "../modules/auth/auth.service.js";

export type AuthContext = {
  userId: string;
  email: string;
  roles: { code: string; departmentId: string | null }[];
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/** Requires a valid access token (cookie, or "Authorization: Bearer" for API testing). */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.get("authorization");
  const raw =
    (req.cookies?.access_token as string | undefined) ??
    (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!raw) throw new AppError(401, "Authentication required", "UNAUTHENTICATED");

  let payload: { sub: string; iat: number };
  try {
    payload = verifyAccessToken(raw);
  } catch {
    throw new AppError(401, "Invalid or expired token", "TOKEN_INVALID");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null, accountStatus: "ACTIVE" },
    select: { id: true, collegeEmail: true, passwordChangedAt: true },
  });
  if (!user) throw new AppError(401, "Invalid or expired token", "TOKEN_INVALID");

  // Tokens issued before a password change stop working immediately.
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new AppError(401, "Invalid or expired token", "TOKEN_INVALID");
  }

  const roles = await getActiveRoles(user.id);
  req.auth = {
    userId: user.id,
    email: user.collegeEmail,
    roles: roles.map((r) => ({ code: r.code, departmentId: r.departmentId })),
  };
  next();
};

/** Use after requireAuth: allows the request only if the user holds one of the role codes. */
export const requireRole =
  (...codes: string[]): RequestHandler =>
  async (req, _res, next) => {
    const auth = req.auth;
    if (!auth) throw new AppError(401, "Authentication required", "UNAUTHENTICATED");
    if (!auth.roles.some((r) => codes.includes(r.code))) {
      await audit({
        actorUserId: auth.userId,
        eventType: "authz.role_check",
        outcome: "DENIED",
        reason: `needs_one_of:${codes.join(",")}`,
        req,
      });
      throw new AppError(403, "You do not have permission to do this", "FORBIDDEN");
    }
    next();
  };
