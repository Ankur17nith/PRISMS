import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(7),

  MAX_THESIS_FILE_SIZE_BYTES: z.coerce.number().positive().default(20 * 1024 * 1024), // 20 MiB
  THESIS_STORAGE_PATH: z.string().default("./storage/theses"),

  // Leave empty while testing with sample mail; set to e.g. "nith.ac.in" later.
  ALLOWED_EMAIL_DOMAIN: z.string().optional(),

  // Leave SMTP_HOST empty to print emails to the console instead of sending.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("PRISMS <no-reply@prisms.local>"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
