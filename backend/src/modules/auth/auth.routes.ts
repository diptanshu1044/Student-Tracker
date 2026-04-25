import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  changePasswordController,
  forgotPasswordController,
  loginController,
  meController,
  refreshController,
  registerController,
  resetPasswordController,
  resendVerificationController,
  updateMeController,
  updateNotificationPreferencesController,
  verifyEmailController
} from "./auth.controller";

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8)
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(10)
  })
});

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120)
  })
});

const updateNotificationPreferencesSchema = z.object({
  body: z
    .object({
      email: z.boolean().optional(),
      streak: z.boolean().optional(),
      applications: z.boolean().optional(),
      weekly: z.boolean().optional(),
      plannerReminders: z.boolean().optional()
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one preference must be provided"
    })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8)
  })
});

const changePasswordSchema = z.object({
  body: z
    .object({
      oldPassword: z.string().min(8),
      newPassword: z.string().min(8),
      confirmNewPassword: z.string().min(8)
    })
    .refine((value) => value.newPassword === value.confirmNewPassword, {
      message: "New password and confirmation must match",
      path: ["confirmNewPassword"]
    })
    .refine((value) => value.oldPassword !== value.newPassword, {
      message: "New password must be different from old password",
      path: ["newPassword"]
    })
});

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), registerController);
authRouter.post("/login", validate(loginSchema), loginController);
authRouter.post("/refresh", validate(refreshSchema), refreshController);
authRouter.get("/verify-email", validate(verifyEmailSchema), verifyEmailController);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), forgotPasswordController);
authRouter.post("/reset-password", validate(resetPasswordSchema), resetPasswordController);
authRouter.post("/change-password", authGuard, validate(changePasswordSchema), changePasswordController);
authRouter.post("/resend-verification", authGuard, resendVerificationController);
authRouter.get("/me", authGuard, meController);
authRouter.patch("/me", authGuard, validate(updateMeSchema), updateMeController);
authRouter.patch(
  "/notification-preferences",
  authGuard,
  validate(updateNotificationPreferencesSchema),
  updateNotificationPreferencesController
);
