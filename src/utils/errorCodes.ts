/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  METHOD_NOT_ALLOWED: 405,
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
  INVALID_INPUT: "Error_Invalid",
  OVER_LIMIT: "Error_OverLimit",
  INVALID: "Error_Invalid",
  EXPIRED: "Error_Expired",
  BAD_REQUEST: "Error_BadRequest",
  FREEZE: "Error_Freeze",
  UNAUTHENTICATED: "Error_Unauthenticated",
  ACCESS_TOKEN_EXPIRED: "Error_AccessTokenExpired",
  ATTACK: "Error_Attack"
} as const;
