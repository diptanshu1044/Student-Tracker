import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    data: null,
    error: "Route not found"
  });
}
