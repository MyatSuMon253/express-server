import { NextFunction, Response } from "express";
import { CustomRequest } from "../../types";

export const getAllUsers = (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = req.userId;

  res.status(200).json({ message: req.t("welcome"), currentUserId: id });
};
