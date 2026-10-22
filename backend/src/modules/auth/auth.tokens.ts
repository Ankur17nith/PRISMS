import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../../config/env.js";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Random opaque token; only its SHA-256 hash is stored in the database. */
export const newOpaqueToken = () => randomBytes(32).toString("base64url");

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: Math.round(env.ACCESS_TOKEN_TTL_MINUTES * 60),
  });
}

export function verifyAccessToken(token: string): { sub: string; iat: number } {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string" || !decoded.sub || typeof decoded.iat !== "number") {
    throw new Error("Malformed token");
  }
  return { sub: decoded.sub, iat: decoded.iat };
}

const baseCookie = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, {
    ...baseCookie,
    path: "/",
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60_000,
  });
  // The refresh cookie is only ever sent to /auth/* routes.
  res.cookie("refresh_token", refreshToken, {
    ...baseCookie,
    path: "/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { ...baseCookie, path: "/" });
  res.clearCookie("refresh_token", { ...baseCookie, path: "/auth" });
}
