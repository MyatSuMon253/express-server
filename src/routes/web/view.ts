import express from "express";

import { home, users } from "../../controllers/web/viewController";

const router = express.Router();

router.get("/home", home);
router.get("/users", users);

export default router;
