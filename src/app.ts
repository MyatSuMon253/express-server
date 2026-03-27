import express, { NextFunction, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import path from "path";
import cron from "node-cron";

import { limiter } from "./middlewares/rate_limiter";
import { CustomRequest } from "./types";
import routes from "./routes/v1";
import {
  createOrUpdateSettingStatus,
  getSettingStatus,
} from "./services/settingService";

export const app = express();

const whitelist = ["http://localhost:5173"];
const corsOptions = {
  origin: function (
    origin: any,
    callback: (err: Error | null, origin?: any) => void,
  ) {
    // allow requests with no origin (like mobile apps or curl requests)
    // accept mobile and postman
    if (!origin) return callback(null, true);

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // allow cookies or authorization header
};

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(cors(corsOptions))
  .use(helmet())
  .use(compression())
  .use(limiter);

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(
        process.cwd(),
        "src/locales",
        "{{lng}}",
        "{{ns}}.json",
      ),
    },
    detection: {
      order: ["querystring", "cookie"],
      caches: ["cookie"],
    },
    fallbackLng: "en",
    preload: ["en", "mm"],
  });

app.use(middleware.handle(i18next));
app.use(routes);

app.use((error: any, req: CustomRequest, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  const errorCode = error.code || "INTERNAL_SERVER_ERROR";
  res.status(status).json({ message, errorCode });
});

cron.schedule("* * * * *", async () => {
  console.log("running a task every minute for testing purpose");

  const setting = await getSettingStatus("maintenance");
  if (setting?.value === "true") {
    await createOrUpdateSettingStatus("maintenance", "false");
    console.log("Now maintenance mode is off");
  }
});
