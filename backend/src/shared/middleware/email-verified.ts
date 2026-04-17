import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { UserModel } from "../../models/user.model";

export async function emailVerifiedGuard(req: Request, res: Response, next: NextFunction) {
  if (env.EMAIL_VERIFICATION_MOCK) {
    return next();
  }

  const userId = req.user?.id;

  if (!userId) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      data: null,
      error: "Unauthorized"
    });
  }

  const user = await UserModel.findById(userId).select("emailVerified");

  if (!user?.emailVerified) {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      data: null,
      error: "Email verification is required to use planner features"
    });
  }

  return next();
}
