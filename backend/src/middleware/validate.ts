import type { RequestHandler } from "express";
import type { z } from "zod";

export const validate =
  (schema: z.ZodType): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
