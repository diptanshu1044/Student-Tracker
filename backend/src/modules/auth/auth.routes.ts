import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  loginController,
  meController,
  refreshController,
  registerController,
  resendVerificationController,
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

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), registerController);
authRouter.post("/login", validate(loginSchema), loginController);
authRouter.post("/refresh", validate(refreshSchema), refreshController);
authRouter.get("/verify-email", validate(verifyEmailSchema), verifyEmailController);
authRouter.post("/resend-verification", authGuard, resendVerificationController);
authRouter.get("/me", authGuard, meController);
