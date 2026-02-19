import express, { NextFunction, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser"; 

import { limiter } from "./middlewares/rate_limiter";
import { auth } from "./middlewares/auth";
import { CustomRequest } from "./types";
import authRoutes from "./routes/v1/auth";
import userRoutes from "./routes/v1/admin/user";

export const app = express();

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(limiter);

app.use("/api/v1", authRoutes);
app.use("/api/v1/admin", auth, userRoutes);

app.use((error: any, req: CustomRequest, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  const errorCode = error.code || "INTERNAL_SERVER_ERROR";
  res.status(status).json({ message, errorCode });
});
