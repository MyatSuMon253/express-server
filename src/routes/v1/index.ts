import express from "express";

import { auth } from "../../middlewares/auth";
import { authorise } from "../../middlewares/authorise";
import authRoutes from "./auth";
import adminRoutes from "./admin";
import userRoutes from "./api";
import { maintain } from "../../middlewares/maintenance";

const router = express.Router();

router.use("/api/v1", maintain, authRoutes);
router.use("/api/v1/user", maintain, userRoutes);
router.use("/api/v1/admin", auth, authorise(true, "ADMIN"), adminRoutes);

export default router;
