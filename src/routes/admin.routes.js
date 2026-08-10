import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import requireRole from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import {
  userIdValidation,
  updateUserRoleValidation,
  updateUserStatusValidation,
} from "../validations/admin.validation.js";

import { updateProfileValidation } from "../validations/profile.validation.js";

import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
  deleteUser,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/users", authMiddleware, requireRole("admin"), createUser);

router.get("/users", authMiddleware, requireRole("admin"), getAllUsers);

router.get(
  "/users/:id",
  authMiddleware,
  requireRole("admin"),
  userIdValidation,
  validate,
  getUserById,
);

router.put(
  "/users/:id",
  authMiddleware,
  requireRole("admin"),
  updateProfileValidation,
  validate,
  updateUser,
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  requireRole("admin"),
  updateUserRoleValidation,
  validate,
  changeUserRole,
);

router.patch(
  "/users/:id/status",
  authMiddleware,
  requireRole("admin"),
  updateUserStatusValidation,
  validate,
  changeUserStatus,
);

router.delete(
  "/users/:id",
  authMiddleware,
  requireRole("admin"),
  userIdValidation,
  validate,
  deleteUser,
);

export default router;
