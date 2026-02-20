import { NextFunction, Response } from "express";

import { CustomRequest } from "../../types";
import { query, validationResult } from "express-validator";
import { createError } from "../../utils/error";
import { errorCode } from "../../config/errorCode";

export const changeLanguage = [
  query("lng", "Invalid language code.")
    .trim()
    .notEmpty()
    .matches("^[a-z]+$")
    .isLength({ min: 2, max: 3 }),
  (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });

    // if validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { lng } = req.query;
    res.cookie("i18next", lng);

    res.status(200).json({ message: req.t("changeLang", { lang: lng }) });
  },
];
