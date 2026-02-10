import { Request, Response, NextFunction } from "express";

export interface CustomRequest extends Request {
  userId?: number;
}

export const check = (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const err: any = new Error("Token has expired");
  err.status = 401;
  err.code = "ERROR_TOKEN_EXPIRED";

  return next(err);

  req.userId = 12345;
  next();
};
