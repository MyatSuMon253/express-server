import express from "express";

import {
  changeLanguage,
  getMyPhoto,
  testPermissions,
  uploadMultiplePhotos,
  uploadProfile,
  uploadProfileOptimize,
} from "../../../controllers/api/profileController";
import { auth } from "../../../middlewares/auth";
import upload, { uploadMemory } from "../../../middlewares/uploadFile";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.get("/test-permission", auth, testPermissions);

router.patch("/profile/upload", auth, upload.single("avatar"), uploadProfile);
router.patch(
  "/profile/upload/optimize",
  upload.single("avatar"),
  uploadProfileOptimize,
);
router.patch(
  "/profile/upload/multiple",
  upload.array("avatar"),
  uploadMultiplePhotos,
);

router.get("/profile/my-photo", getMyPhoto);

export default router;
