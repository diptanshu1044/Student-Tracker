import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  resendEmailVerification,
  rotateRefreshToken,
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
