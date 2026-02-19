import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  createOtp,
  createUser,
  getOtpByPhone,
  getUserByPhone,
  updateOtp,
  updateUser,
} from "../services/authService";
import {
  checkOtpErrorIfSameDate,
  checkOtpRow,
  checkUserExist,
  checkUserIfNotExist,
} from "../utils/auth";
import { generateOTP, generateToken } from "../utils/generate";
import { createError } from "../utils/error";
import { HTTP_STATUS, ERROR_CODES } from "../utils/errorCodes";
import moment from "moment";

export const register = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, ERROR_CODES.INVALID_INPUT));
    }

    let phone = req.body.phone;
    if (phone.slice(0, 2) === "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserExist(user);

    // OTP sending logic here
    // Generate OTP & call OTP sending API
    // if sms OTP cannot be sent, response error
    // Save OTP to DB
    // const otp = generateOTP();
    const otp = 123456;
    const salt = await bcrypt.genSalt(10);
    const hasedOtp = await bcrypt.hash(otp.toString(), salt);
    const token = generateToken();

    const otpRow = await getOtpByPhone(phone);
    let result;

    if (!otpRow) {
      const otpData = {
        phone,
        otp: hasedOtp,
        rememberToken: token,
        count: 1,
      };
      result = await createOtp(otpData);
    } else {
      const lastOtpRequest = new Date(otpRow.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastOtpRequest === today;
      checkOtpErrorIfSameDate(isSameDate, otpRow.error);

      if (!isSameDate) {
        const otpData = {
          phone,
          otp: hasedOtp,
          rememberToken: token,
          count: 1,
          error: 0,
        };
        result = await updateOtp(otpRow.id, otpData);
      } else {
        if (otpRow.count === 3) {
          return next(
            createError(
              "OTP is allowed to request 3 times per day.",
              405,
              ERROR_CODES.OVER_LIMIT,
            ),
          );
        } else {
          const otpData = {
            phone,
            otp: hasedOtp,
            rememberToken: token,
            count: { increment: 1 },
          };
          result = await updateOtp(otpRow.id, otpData);
        }
      }
    }

    res.status(200).json({
      message: `We are sending OTP to 09${result.phone}`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

export const verifyOtp = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
  body("otp", "Invalid otp")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 6, max: 6 }),
  body("token", "Invalid token").trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, ERROR_CODES.INVALID_INPUT));
    }

    const { phone, otp, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    const lastOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lastOtpVerify === today;

    // if otpVerify is in the same date and over limit
    checkOtpErrorIfSameDate(isSameDate, otpRow!.error);

    if (otpRow?.rememberToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);

      return next(createError("Invalid token", 400, ERROR_CODES.INVALID));
    }

    // otp is expired 2 min
    const isExpired = moment().diff(otpRow?.updatedAt, "minute") > 2;
    if (isExpired) {
      return next(createError("Otp is expired", 403, ERROR_CODES.EXPIRED));
    }

    const isMatch = await bcrypt.compare(otp, otpRow!.otp);
    // otp is wrong
    if (!isMatch) {
      // if otp error is first time today
      if (!isSameDate) {
        const otpData = {
          error: 1,
        };
        await updateOtp(otpRow!.id, otpData);
      } else {
        // if otp error is not first time today
        const otpData = {
          error: { increment: 1 },
        };
        await updateOtp(otpRow!.id, otpData);
      }
      return next(createError("Otp is incorrect", 400, ERROR_CODES.INVALID));
    }

    const verifyToken = generateToken();
    const otpData = {
      verifyToken,
      error: 0,
      count: 1,
    };

    const result = await updateOtp(otpRow!.id, otpData);

    res.status(200).json({
      message: "OTP is successfully verify",
      phone: result.phone,
      token: verifyToken,
    });
  },
];

export const confirmPassword = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
  body("password", "Password must be at least 6 characters")
    .trim()
    .notEmpty()
    .isLength({ min: 6, max: 6 }),
  body("token", "Invalid token").trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, ERROR_CODES.INVALID_INPUT));
    }

    const { phone, password, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    // otp error count is over limit
    if (otpRow?.error === 5) {
      return next(
        createError(
          "This request may be an attack",
          400,
          ERROR_CODES.BAD_REQUEST,
        ),
      );
    }

    // token is wrong
    if (otpRow?.verifyToken !== token) {
      const otpData = {
        error: 5,
      };
      await updateOtp(otpRow!.id, otpData);

      return next(createError("Invalid token", 400, ERROR_CODES.INVALID));
    }

    // request is expired (2min)
    const isExpired = moment().diff(otpRow!.updatedAt, "minute") > 10;
    if (isExpired) {
      return next(
        createError(
          "Your request is expired. Please try again",
          403,
          ERROR_CODES.EXPIRED,
        ),
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const randToken = "I will replace refresh token soon.";

    const userData = { phone, password: hashedPassword, randToken };
    const newUser = await createUser(userData);

    const accessTokenPayload = { userId: newUser.id };
    const refreshTokenPayload = { userId: newUser.id, phone: newUser.phone };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 15,
      },
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      },
    );

    const userUpdateData = {
      randToken: refreshToken,
    };
    await updateUser(newUser.id, userUpdateData);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NOED_ENV === "production",
        sameSite: process.env.NOED_ENV === "production" ? "none" : "strict",
        maxAge: 1000 * 60 * 15, // 15 minutes
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NOED_ENV === "production",
        sameSite: process.env.NOED_ENV === "production" ? "none" : "strict",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      })
      .status(201)
      .json({
        message: "successfully createed an account",
        userId: newUser.id,
      });
  },
];

export const login = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
  body("password", "Password must be at least 6 characters")
    .trim()
    .notEmpty()
    .isLength({ min: 6, max: 6 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, ERROR_CODES.INVALID_INPUT));
    }

    const password = req.body.password;
    let phone = req.body.phone;
    if (phone.slice(0, 2) === "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    // wrong password is over limit
    if (user!.status === "FREEZE") {
      return next(
        createError(
          "Your account is frozen. Please contact us",
          401,
          ERROR_CODES.FREEZE,
        ),
      );
    }

    const isMatchedPassword = await bcrypt.compare(password, user!.password);
    if (!isMatchedPassword) {
      // record wrong time
      const lastRequest = new Date(user!.updatedAt).toLocaleDateString();
      const isSameDate = lastRequest == new Date().toLocaleDateString();

      // today password wrong first time
      if (!isSameDate) {
        const userData = {
          errorLoginCount: 1,
        };
        await updateUser(user!.id, userData);
      } else {
        // today password wrong 2 times
        if (user!.errorLoginCount >= 2) {
          const userData = {
            status: "FREEZE",
          };
          await updateUser(user!.id, userData);
        } else {
          // today password wrong 1 time
          const userData = {
            errorLoginCount: { increment: 1 },
          };
          await updateUser(user!.id, userData);
        }
      }

      return next(
        createError("Password is incorrect", 401, ERROR_CODES.UNAUTHENTICATED),
      );
    }

    // authorization token
    const accessTokenPayload = { userId: user!.id };
    const refreshTokenPayload = { userId: user!.id, phone: user!.phone };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 15,
      },
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      },
    );

    const userUpdateData = {
      errorLoginCount: 0, // reset err count
      randToken: refreshToken,
    };
    await updateUser(user!.id, userUpdateData);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NOED_ENV === "production",
        sameSite: process.env.NOED_ENV === "production" ? "none" : "strict",
        maxAge: 1000 * 60 * 15, // 15 minutes
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NOED_ENV === "production",
        sameSite: process.env.NOED_ENV === "production" ? "none" : "strict",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      })
      .status(200)
      .json({ message: "successfully login" });
  },
];
