import { Request, Response, NextFunction } from "express";
import { query, param, validationResult } from "express-validator";

import { checkUserIfNotExist } from "../../utils/auth";
import { checkModelIfExist } from "../../utils/check";
import { createError } from "../../utils/error";
import { getUserById } from "../../services/authService";
import { errorCode } from "../../config/errorCode";
import { getPostWithRelations } from "../../services/postService";

interface CustomRequest extends Request {
  userId?: number;
}

export const getPost = [
  param("id", "Post ID is required.").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const postId = req.params.id;

    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExist(user);

    const post = await getPostWithRelations(+postId);
    checkModelIfExist(post);

    const modifiedPost = {
      id: post!.id,
      title: post?.title,
      content: post?.content,
      body: post?.body,
      image: "/optimize/" + post?.image.split(".")[0] + ".webp",
      updatedAt: post?.updatedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      fullName:
        (post?.author.firstName ?? "") + " " + (post?.author.lastName ?? ""),
      category: post?.category.name,
      type: post?.type.name,
      tags:
        post?.tags && post.tags.length > 0
          ? post.tags.map((i) => i.name)
          : null,
    };

    res.status(200).json({ message: "Post Detail", post: modifiedPost });
  },
];
