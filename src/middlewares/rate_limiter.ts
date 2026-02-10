import { rateLimit } from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 15, // limit each IP to 15 requests per windowMs
  standardHeaders: "draft-7", // draft-7 rate limit standard headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
