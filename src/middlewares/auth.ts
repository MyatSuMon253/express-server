import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { createError } from "../utils/error";
import { CustomRequest } from "../types";
import { errorCode } from "../config/errorCode";
import { getUserById, updateUser } from "../services/authService";

export const auth = (req: CustomRequest, res: Response, next: NextFunction) => {
  const platform = req.headers["x-platform"];
  if (platform === "mobile") {
    const accessTokenMobile = req.headers.authorization?.split(" ")[1];
    console.log("Request from Mobile", accessTokenMobile);
  } else {
    console.log("Request from Web");
  }

  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    return next(
      createError(
        "You are not authenticated user.",
        401,
        errorCode.unauthenticated,
      ),
    );
  }

  const generateNewTokens = async () => {
    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
        id: number;
        phone: string;
      };
    } catch (error) {
      return next(
        createError(
          "You are not authenticated user.",
          401,
          errorCode.unauthenticated,
        ),
      );
    }

    if (isNaN(decoded.id)) {
      return next(
        createError(
          "You are not authenticated user.",
          401,
          errorCode.unauthenticated,
        ),
      );
    }

    const user = await getUserById(decoded.id);
    if (!user) {
      return next(
        createError(
          "This account has not registered.",
          401,
          errorCode.unauthenticated,
        ),
      );
    }

    if (user.phone !== decoded.phone) {
      return next(
        createError(
          "You are not authenticated user.",
          401,
          errorCode.unauthenticated,
        ),
      );
    }

    if (user.randToken !== refreshToken) {
      return next(
        createError(
          "You are not authenticated user.",
          401,
          errorCode.unauthenticated,
        ),
      );
    }

    // authorization token
    const accessTokenPayload = { id: user!.id };
    const refreshTokenPayload = { id: user!.id, phone: user!.phone };

    const newAccessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 15,
      },
    );

    const newRefreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      },
    );

    const userUpdateData = {
      randToken: newRefreshToken,
    };
    await updateUser(user.id, userUpdateData);

    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NOED_ENV === "production",
        sameSite: process.env.NOED_ENV === "production" ? "none" : "strict",
        maxAge: 1000 * 60 * 15, // 15 minutes
      })
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NOED_ENV === "production",
        sameSite: process.env.NOED_ENV === "production" ? "none" : "strict",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });

    req.userId = user.id;
    next();
  };

  if (!accessToken) {
    generateNewTokens();
  } else {
    // verify access token
    let decoded;

    try {
      decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as {
        id: number;
      };

      if (isNaN(decoded.id)) {
        return next(
          createError(
            "You are not authenticated user.",
            401,
            errorCode.unauthenticated,
          ),
        );
      }

      req.userId = decoded.id;
      next();
    } catch (error: any) {
      let err;
      if (error.name === "TokenExpiredError") {
        generateNewTokens();
      } else {
        return next(createError(error.message, 400, errorCode.attack));
      }
    }
  }

  next();
};
