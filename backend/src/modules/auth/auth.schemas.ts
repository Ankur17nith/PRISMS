import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const newPassword = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters");
const token = z.string().min(20).max(200);

export const signupSchema = z.object({
  email,
  password: newPassword,
  fullName: z.string().trim().min(2).max(120),
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const verifyEmailSchema = z.object({ token });
export const emailOnlySchema = z.object({ email });
export const resetPasswordSchema = z.object({ token, password: newPassword });
