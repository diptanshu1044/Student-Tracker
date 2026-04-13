import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ok } from "../../shared/utils/api-response";
import { loginUser, registerUser, rotateRefreshToken } from "./auth.service";

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
