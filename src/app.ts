import express, { NextFunction, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";

import { limiter } from "./middlewares/rate_limiter";
import { check, CustomRequest } from "./middlewares/check";

export const app = express();

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(limiter);

app.get("/health", check, (req: CustomRequest, res: Response) => {
  throw new Error("Test Error Occurred!");
  res.status(200).json({ message: "OK", userId: req.userId });
});

app.use((error: any, req: CustomRequest, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  const errorCode = error.code || "INTERNAL_SERVER_ERROR";
  res.status(status).json({ message, errorCode });
});
