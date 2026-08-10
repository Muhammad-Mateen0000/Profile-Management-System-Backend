import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import requireRole from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";
import upload from "../middleware/upload.middleware.js";

import { updateProfileValidation } from "../validations/profile.validation.js";

import {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
  deleteProfileImage,
} from "../controllers/profile.controller.js";

const router = express.Router();

router.get("/", authMiddleware, requireRole("user", "admin"), getMyProfile);

router.put(
  "/",
  authMiddleware,
  requireRole("user", "admin"),
  updateProfileValidation,
  validate,
  updateMyProfile,
);

router.post(
  "/avatar",
  authMiddleware,
  requireRole("user", "admin"),
  upload.single("avatar"),
  uploadProfileImage,
);

router.delete(
  "/avatar",
  authMiddleware,
  requireRole("user", "admin"),
  deleteProfileImage,
);

export default router;
