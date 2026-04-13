import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      data: null,
      error: "Missing or invalid authorization header"
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.userId };
    return next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      data: null,
      error: "Invalid or expired access token"
    });
  }
}
