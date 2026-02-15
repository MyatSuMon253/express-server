import express, { NextFunction, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";

import { limiter } from "./middlewares/rate_limiter";
import { CustomRequest } from "./middlewares/check";
import healthRoute from "./routes/v1/health";
import viewRoutes from "./routes/web/view";
import * as errorController from "./controllers/web/errorController";

export const app = express();

app.set("view engine", "ejs");
app.set("views", "src/views");

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(limiter);

app.use(express.static("public"));
app.use("/api/v1", healthRoute);
app.use(viewRoutes);

app.use(errorController.notFound);

app.use((error: any, req: CustomRequest, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  const errorCode = error.code || "INTERNAL_SERVER_ERROR";
  res.status(status).json({ message, errorCode });
});
