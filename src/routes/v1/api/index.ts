import express from "express";

import {
  changeLanguage,
  testPermissions,
} from "../../../controllers/api/profileController";
import { auth } from "../../../middlewares/auth";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.get("/test-permission", auth, testPermissions);

export default router;
