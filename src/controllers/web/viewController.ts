import { NextFunction, Request, Response } from "express";

export const home = (req: Request, res: Response, next: NextFunction) => {
  res.render("index", { title: "Home" });
};

export const users = (req: Request, res: Response, next: NextFunction) => {
  const users = [
    { name: "John", age: 30 },
    { name: "Jane", age: 25 },
  ];
  res.render("users", { title: "Users", users });
};
