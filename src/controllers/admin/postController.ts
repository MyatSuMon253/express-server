import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import sanitizeHtml from "sanitize-html";

import { checkModelIfExist, checkUploadFile } from "../../utils/check";
import { createError } from "../../utils/error";
import ImageQueue from "../../jobs/queues/imageQueue";
import {
  createOnePost,
  deleteOnePost,
  getPostById,
  PostArgs,
  updateOnePost,
} from "../../services/postService";
import { unlink as fsUnlink, unlink } from "fs/promises";
import { errorCode } from "../../config/errorCode";
import path from "path";
import { getUserById } from "../../services/authService";

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

const removeFiles = async (
  originalFile: string,
  optimizedFile: string | null,
) => {
  try {
    const originalFilePath = path.join(
      __dirname,
      "../../..",
      "/uploads/images",
      originalFile,
    );

    // await safeUnlink(originalFilePath);  // Use this For windows error - 'EPERM' or 'EBUSY'
    await unlink(originalFilePath);

    if (optimizedFile) {
      const optimizedFilePath = path.join(
        __dirname,
        "../../..",
        "/uploads/optimize",
        optimizedFile,
      );

      // await safeUnlink(optimizedFilePath);  // Use this For windows error - 'EPERM' or 'EBUSY'
      await unlink(optimizedFilePath);
    }
  } catch (error) {
    console.log(error);
  }
};

export const createPost = [
  body("title", "Title is required.").trim().notEmpty().escape(),
  body("content", "Content is required.").trim().notEmpty().escape(),
  body("body", "Body is required.")
    .trim()
    .notEmpty()
    .customSanitizer((value) => sanitizeHtml(value))
    .notEmpty(),
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
    const userId = req.userId;
    checkUploadFile(req.file);

    const user = await getUserById(userId!);
    if (!user) {
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }

      return next(
        createError(
          "This user has not registered.",
          401,
          errorCode.unauthenticated,
        ),
      );
    }

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

export const updatePost = [
  body("postId", "Post Id is required.").isInt({ min: 1 }),
  body("title", "Title is required.").trim().notEmpty().escape(),
  body("content", "Content is required.").trim().notEmpty().escape(),
  body("body", "Body is required.")
    .trim()
    .notEmpty()
    .customSanitizer((value) => sanitizeHtml(value))
    .notEmpty(),
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
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { postId, title, content, body, category, type, tags } = req.body;

    // const userId = req.userId;
    const user = req.user;
    // const user = await getUserById(userId!);
    // if (!user) {
    //   if (req.file) {
    //     await removeFiles(req.file.filename, null);
    //   }

    //   return next(
    //     createError(
    //       "This user has not registered.",
    //       401,
    //       errorCode.unauthenticated
    //     )
    //   );
    // }

    const post = await getPostById(+postId); // "8" -> 8
    if (!post) {
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }

      return next(
        createError("This data model does not exist.", 401, errorCode.invalid),
      );
    }

    // admin A ---> Post A --> update/delete
    // admin B ---> update/delete --> Post A X
    if (user.id !== post.authorId) {
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }

      return next(
        createError("This action is not allowed.", 403, errorCode.unauthorised),
      );
    }

    const data: any = {
      title,
      content,
      body,
      image: req.file,
      category,
      type,
      tags,
    };

    if (req.file) {
      data.image = req.file.filename;

      const splitFileName = req.file.filename.split(".")[0];

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

      const optimizedFile = post.image.split(".")[0] + ".webp";
      await removeFiles(post.image, optimizedFile);
    }

    const postUpdated = await updateOnePost(post.id, data);

    res.status(200).json({
      message: "Successfully updated the post.",
      postId: postUpdated.id,
    });
  },
];

export const deletePost = [
  body("postId", "Post Id is required.").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { postId } = req.body;

    // const userId = req.userId;
    // const user = await getUserById(userId!);
    // checkUserIfNotExist(user);
    const user = req.user;

    const post = await getPostById(+postId);
    checkModelIfExist(post);

    if (user!.id !== post!.authorId) {
      return next(
        createError("This action is not allowed.", 403, errorCode.unauthorised),
      );
    }

    const postDeleted = await deleteOnePost(post!.id);
    const optimizedFile = post!.image.split(".")[0] + ".webp";
    await removeFiles(post!.image, optimizedFile);

    res.status(200).json({
      message: "Successfully deleted the post.",
      postId: postDeleted.id,
    });
  },
];
