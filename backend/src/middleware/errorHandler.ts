import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: "Not found", code: "NOT_FOUND" } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: { message: "Internal server error", code: "INTERNAL" } });
};
