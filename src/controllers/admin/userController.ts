import { NextFunction, Response } from "express";

import { CustomRequest } from "../../types";

export const getAllUsers = (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  console.log("requserklr", req.user);
  res
    .status(200)
    .json({ message: req.t("welcome"), currentUserRole: user.role });
};
