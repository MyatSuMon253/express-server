import { NextFunction, Response } from "express";

import { CustomRequest } from "../types";

export const healthCheck = (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  res.status(200).json({ message: "OK", userId: req.userId });
};
