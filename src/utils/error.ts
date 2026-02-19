/**
 * Creates a standardized error object with status code and error code
 * @param message - Error message to display
 * @param status - HTTP status code
 * @param code - Custom error code for identification
 * @returns Error object with status and code properties
 */
export const createError = (message: string, status: number, code: string) => {
  const error: any = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};
