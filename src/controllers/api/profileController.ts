import { NextFunction, Response } from "express";
import { unlink } from "node:fs/promises";
import path from "path";
import sharp from "sharp";

import { CustomRequest } from "../../types";
import { query, validationResult } from "express-validator";
import { createError } from "../../utils/error";
import { errorCode } from "../../config/errorCode";
import { getUserById, updateUser } from "../../services/authService";
import { checkUserIfNotExist } from "../../utils/auth";
import { authorise } from "../../utils/authorise";
import { checkUploadFile } from "../../utils/check";

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

export const testPermissions = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);

  const info: any = {
    title: "Testing Permission",
  };

  const can = authorise(true, user!.role, "AUTHOR");
  if (can) {
    info.content = "You have permission to read this content.";
  }

  res.status(200).json({ info });
};

export const uploadProfile = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);

  const image = req.file;
  checkUploadFile(image);

  const fileName = image?.filename;
  // const filePath = image?.path; // linux OS
  // const filePath = image?.path.replace("\\", "/"); // window OS

  if (user?.image) {
    try {
      const filePath = path.join(
        __dirname,
        "../../..",
        "/uploads/images",
        user?.image!,
      );
      await unlink(filePath!);
    } catch (error) {
      console.log(error);
    }
  }

  const userData = {
    image: fileName,
  };

  await updateUser(user?.id!, userData);

  res.status(200).json({
    message: "Profile picture uploaded successfully.",
    image: `uploads/images/${fileName}`,
  });
};

export const getMyPhoto = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const file = path.join(
    __dirname,
    "../../..",
    "/uploads/images/",
    "profile.png",
  );

  res.sendFile(file, (err) => {
    res.status(404).send("File not found");
  });
};

export const uploadMultiplePhotos = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);

  const images = req.files;
  console.log(images);

  res.status(200).json({
    message: "Multiple product photo uploaded successfully.",
  });
};

export const uploadProfileOptimize = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);

  const image = req.file;
  checkUploadFile(image);

  const fileName = Date.now() + "-" + `${Math.round(Math.random() * 1e9)}.webp`;

  try {
    const optimizedImagePath = path.join(
      __dirname,
      "../../..",
      "/uploads/images",
      fileName,
    );
    await sharp(req.file?.buffer)
      .resize(200, 200)
      .webp({ quality: 50 })
      .toFile(optimizedImagePath);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Image optimization failed.",
    });
    return;
  }

  if (user?.image) {
    try {
      const filePath = path.join(
        __dirname,
        "../../..",
        "/uploads/images",
        user?.image!,
      );
      await unlink(filePath!);
    } catch (error) {
      console.log(error);
    }
  }

  const userData = {
    image: fileName,
  };

  await updateUser(user?.id!, userData);

  res.status(200).json({
    message: "Profile picture uploaded successfully.",
    image: `uploads/images/${fileName}`,
  });
};
