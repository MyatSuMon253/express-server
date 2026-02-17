export const checkUserExist = (user: any) => {
  if (user) {
    const error: any = new Error("User already exists");
    error.status = 409;
    error.code = "Error_AlreadyExist";
    throw error;
  }
};

export const checkOtpErrorIfSameDate = (
  isSameDate: boolean,
  errorCount: number,
) => {
  if (isSameDate && errorCount === 5) {
    const error: any = new Error(
      "OTP is wrong for 5 times. Please try again tomorrow",
    );
    error.status = 401;
    error.code = "Error_OverLimit";
    throw error;
  }
};
