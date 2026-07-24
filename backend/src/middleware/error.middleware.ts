import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("❌ Express caught error:", err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error: err.message || "Internal server error occurred",
  });
};
