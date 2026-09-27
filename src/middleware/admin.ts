import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

// Must be used AFTER `protect` middleware
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Admin access required" });
};
