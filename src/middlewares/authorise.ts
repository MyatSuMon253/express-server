import { Response, NextFunction } from "express";

import { CustomRequest } from "../types";
import { getUserById } from "../services/authService";
import { createError } from "../utils/error";
import { errorCode } from "../config/errorCode";

// authorise(true, "ADMIN", "AUTHOR") // deny user
// authorise(false, "USER") // allow author, admin
export const authorise = (permission: boolean, ...roles: string[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await getUserById(userId!);

    if (!user) {
      return next(
        createError(
          "This account has not registered yet.",
          401,
          errorCode.unauthenticated,
        ),
      );
    }

    const result = roles.includes(user.role);

    if (permission && !result) {
      return next(
        createError("This action is not allowed", 403, errorCode.unauthorised),
      );
    }

    if (!permission && result) {
      return next(
        createError("This action is not allowed", 403, errorCode.unauthorised),
      );
    }

    req.user = user;
    next();
  };
};
