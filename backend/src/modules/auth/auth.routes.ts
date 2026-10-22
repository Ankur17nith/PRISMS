import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import * as service from "./auth.service.js";
import {
  emailOnlySchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";

const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60_000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: { message: "Too many requests. Try again later.", code: "RATE_LIMITED" } },
  });

const router = Router();

router.post("/signup", limiter(10), validate(signupSchema), async (req, res) => {
  await service.signup(req.body, req);
  // Same response whether or not the email already existed.
  res.status(202).json({ message: "If this email can be registered, a verification email has been sent." });
});

router.post("/verify-email", limiter(20), validate(verifyEmailSchema), async (req, res) => {
  await service.verifyEmail(req.body.token, req);
  res.json({ message: "Email verified. You can now log in." });
});

router.post("/resend-verification", limiter(5), validate(emailOnlySchema), async (req, res) => {
  await service.resendVerification(req.body.email);
  res.status(202).json({ message: "If the account is waiting for verification, an email has been sent." });
});

router.post("/login", limiter(20), validate(loginSchema), async (req, res) => {
  const user = await service.login(req.body.email, req.body.password, req, res);
  res.json({ user });
});

router.post("/refresh", async (req, res) => {
  await service.refresh(req, res);
  res.status(204).end();
});

router.post("/logout", async (req, res) => {
  await service.logout(req, res);
  res.status(204).end();
});

router.post("/logout-all", requireAuth, async (req, res) => {
  await service.logoutAll(req.auth!.userId, req, res);
  res.status(204).end();
});

router.post("/forgot-password", limiter(5), validate(emailOnlySchema), async (req, res) => {
  await service.forgotPassword(req.body.email, req);
  res.status(202).json({ message: "If an account exists for this email, a reset link has been sent." });
});

router.post("/reset-password", limiter(10), validate(resetPasswordSchema), async (req, res) => {
  await service.resetPassword(req.body.token, req.body.password, req);
  res.json({ message: "Password updated. Please log in again." });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await service.getMe(req.auth!.userId) });
});

export default router;
