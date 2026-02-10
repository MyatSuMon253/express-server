import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";

import { limiter } from "./middlewares/rate_limiter";

export const app = express();

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(limiter);

app.get("/health", (_req, res) => {
  res.status(200).json({ message: "OK" });
});
