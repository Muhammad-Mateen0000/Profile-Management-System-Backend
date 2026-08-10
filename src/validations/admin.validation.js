import { body, param } from "express-validator";

const updateUserRoleValidation = [
  param("id").isUUID().withMessage("Invalid user ID"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["user", "admin"])
    .withMessage("Role must be either user or admin"),
];

const updateUserStatusValidation = [
  param("id").isUUID().withMessage("Invalid user ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["active", "inactive"])
    .withMessage("Status must be either active or inactive"),
];

const userIdValidation = [param("id").isUUID().withMessage("Invalid user ID")];

export {
  updateUserRoleValidation,
  updateUserStatusValidation,
  userIdValidation,
};
