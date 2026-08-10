import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import requireRole from "../middleware/role.middleware.js";
import uploadProfileImage from "../middleware/image.middleware.js";

import { uploadProfileImage as uploadProfileImageController } from "../controllers/image.controller.js";

const router = express.Router();

router.post(
  "/profile-image",
  authMiddleware,
  requireRole("user", "admin"),
  uploadProfileImage.single("image"),
  uploadProfileImageController,
);

export default router;
