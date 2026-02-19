import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { createError } from "../utils/error";
import { CustomRequest } from "../types";
import { errorCode } from "../config/errorCode";

export const auth = (req: CustomRequest, res: Response, next: NextFunction) => {
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;
  console.log(req);
  if (!refreshToken) {
    return next(
      createError(
        "You are not authenticated user.",
        401,
        errorCode.unauthenticated,
      ),
    );
  }

  if (!accessToken) {
    return next(
      createError(
        "Access token has expired.",
        401,
        errorCode.accessTokenExpired,
      ),
    );
  }

  // verify access token
  let decoded;
  try {
    decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as {
      id: number;
    };
    console.log(decoded);
  } catch (error: any) {
    let err;
    if (error.name === "TokenExpiredError") {
      err = createError(
        "Access token has expired.",
        401,
        errorCode.accessTokenExpired,
      );
    } else {
      err = createError(error.message, 400, errorCode.attack);
    }
    return next(err);
  }

  req.userId = decoded.id;

  next();
};
