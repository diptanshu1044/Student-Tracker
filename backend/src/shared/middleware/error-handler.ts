import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { logger } from "../../config/logger";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      data: null,
      error: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      error: err.message
    });
  }

  logger.error({ err }, "Unhandled application error");

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    data: null,
    error: "Internal server error"
  });
}
