import { NextFunction, Request, Response } from "express";

export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: T, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };
}
