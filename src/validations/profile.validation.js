import { body } from "express-validator";

const updateProfileValidation = [
  body("first_name")
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .withMessage("First name must be a string")
    .custom((value) => {
      if (value !== value.trim()) {
        throw new Error("First name must not have leading or trailing spaces");
      }

      return true;
    }),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be a string")
    .custom((value) => {
      if (value !== value.trim()) {
        throw new Error("Last name must not have leading or trailing spaces");
      }

      return true;
    }),

  body("phone")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Phone number must be a string")
    .isLength({ max: 20 })
    .withMessage("Phone number must not exceed 20 characters")
    .matches(/^[0-9+\-().\s]+$/)
    .withMessage("Phone number contains invalid characters"),

  body("bio")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Bio must be a string")
    .isLength({ max: 250 })
    .withMessage("Bio must not exceed 250 characters"),
];

export { updateProfileValidation };
