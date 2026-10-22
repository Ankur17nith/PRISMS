import { prisma } from "./lib/prisma.js";
import express, { type Express, type Request, type Response } from 'express';
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app: Express = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "PRISMS API",
    message: "PhD Research and Scholar Administration Portal API",
  });
});


app.get("/health/db", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      database: "unavailable",
    });
  }
});


app.use("/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;