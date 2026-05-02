import express from "express";
import {
  changeLanguage,
  getMyPhoto,
  testPermissions,
  uploadMultiplePhotos,
  uploadProfile,
} from "../../../controllers/api/profileController";
import { auth } from "../../../middlewares/auth";
import upload from "../../../middlewares/uploadFile";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.get("/test-permission", auth, testPermissions);

router.patch("/profile/upload", auth, upload.single("avatar"), uploadProfile);
router.patch("/profile/upload/multiple", auth, upload.array("avatar"), uploadMultiplePhotos);

router.get("/profile/my-photo", getMyPhoto);

export default router;
