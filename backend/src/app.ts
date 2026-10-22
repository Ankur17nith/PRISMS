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

export default app;