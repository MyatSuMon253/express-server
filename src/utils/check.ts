import { errorCode } from "../config/errorCode";

export const checkUploadFile = (user: any) => {
  if (!user) {
    const error: any = new Error("Invalid Image");
    error.status = 409;
    error.code = errorCode.invalid;
    throw error;
  }
};
