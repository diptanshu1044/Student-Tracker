import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import {
  changeCurrentUserPassword,
  getCurrentUser,
  loginUser,
  requestPasswordReset,
  registerUser,
  resendEmailVerification,
  resetPasswordWithToken,
  rotateRefreshToken,
  updateCurrentUser,
  updateNotificationPreferences,
  verifyEmailToken
} from "./auth.service";

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const data = await registerUser(req.body);
  res.status(StatusCodes.CREATED).json(ok(data));
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const data = await loginUser(req.body);
  res.status(StatusCodes.OK).json(ok(data));
});

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
  const data = await rotateRefreshToken(req.body.refreshToken);
  res.status(StatusCodes.OK).json(ok(data));
});

export const verifyEmailController = asyncHandler(async (req: Request, res: Response) => {
  const data = await verifyEmailToken(req.query.token as string);
  res.status(StatusCodes.OK).json(ok(data));
});

export const resendVerificationController = asyncHandler(async (req: Request, res: Response) => {
  const data = await resendEmailVerification(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const data = await getCurrentUser(req.user!.id);
  res.status(StatusCodes.OK).json(ok(data));
});

export const updateMeController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updateCurrentUser(req.user!.id, req.body);
  res.status(StatusCodes.OK).json(ok(data));
});

export const updateNotificationPreferencesController = asyncHandler(async (req: Request, res: Response) => {
  const data = await updateNotificationPreferences(req.user!.id, req.body);
  res.status(StatusCodes.OK).json(ok(data));
});

export const forgotPasswordController = asyncHandler(async (req: Request, res: Response) => {
  const data = await requestPasswordReset(req.body.email);
  res.status(StatusCodes.OK).json(ok(data));
});

export const resetPasswordController = asyncHandler(async (req: Request, res: Response) => {
  const data = await resetPasswordWithToken(req.body.token, req.body.password);
  res.status(StatusCodes.OK).json(ok(data));
});

export const changePasswordController = asyncHandler(async (req: Request, res: Response) => {
  const data = await changeCurrentUserPassword(req.user!.id, req.body.oldPassword, req.body.newPassword);
  res.status(StatusCodes.OK).json(ok(data));
});
