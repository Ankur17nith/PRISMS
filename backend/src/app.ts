import { prisma } from "./lib/prisma.js";
import express, { type Express, type Request, type Response } from 'express';
import helmet from "helmet";
import cors from "cors";

const app: Express = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
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


export default app;