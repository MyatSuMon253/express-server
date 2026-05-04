import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import sanitizeHtml from "sanitize-html";

import { checkUploadFile } from "../../utils/check";
import { createError } from "../../utils/error";
import ImageQueue from "../../jobs/queues/imageQueue";
import { createOnePost, PostArgs } from "../../services/postService";
import { unlink as fsUnlink } from "fs/promises";
import { errorCode } from "../../config/errorCode";

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
}

async function safeUnlink(
  filePath: string,
  retries = 3,
  delayMs = 100,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fsUnlink(filePath);
      return;
    } catch (err: any) {
      // Only retry on EPERM or EBUSY (Windows file-lock errors)
      if ((err.code === "EPERM" || err.code === "EBUSY") && attempt < retries) {
        // wait a bit, then retry
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }
      // rethrow for any other error, or if out of retries
      throw err;
    }
  }
}

export const createPost = [
  body("title", "Title is required.").trim().notEmpty().escape(),
  body("content", "Content is required.").trim().notEmpty().escape(),
  body("body", "Body is required.")
    .trim()
    .notEmpty()
    .customSanitizer((value) => sanitizeHtml(value)).notEmpty(),
  body("category", "Category is required.").trim().notEmpty().escape(),
  body("type", "Type is required.").trim().notEmpty().escape(),
  body("tags", "Tag is invalid.")
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value) {
        return value.split(",").filter((tag: string) => tag.trim() !== "");
      }
      return value;
    }),

  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { title, content, body, category, type, tags } = req.body;
    // const userId = req.userId;
    const user = req.user;
    checkUploadFile(req.file);

    const splitFileName = req.file?.filename.split(".")[0];

    await ImageQueue.add(
      "optimize-image",
      {
        filePath: req.file?.path,
        fileName: `${splitFileName}.webp`,
        width: 835,
        height: 577,
        quality: 100,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    );

    const data: PostArgs = {
      title,
      content,
      body,
      image: req.file!.filename,
      authorId: user!.id,
      category,
      type,
      tags,
    };

    const post = await createOnePost(data);

    res
      .status(201)
      .json({ message: "Successfully created a new post.", postId: post.id });
  },
];
