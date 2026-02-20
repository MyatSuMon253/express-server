import { Response, NextFunction } from "express";

import { CustomRequest } from "../types";

export const check = (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  req.userId = 12345;
  next();
};
