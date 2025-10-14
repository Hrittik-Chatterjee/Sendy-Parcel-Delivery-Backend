import { NextFunction, Request, Response } from "express";
import AppError from "../errorHelpers/AppError";

import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../config/env";
import { User } from "../modules/user/user.model";
import httpStatus from "http-status-codes";
import { IsActive } from "../modules/user/user.interface";
import { verifyToken } from "../utils/jwt";

export const checkAuth =
  (...authRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to get token from cookies first, then fallback to authorization header
      const accessToken = req.cookies.accessToken || req.headers.authorization;

      if (!accessToken) {
        throw new AppError(401, "No token recieved");
      }

      const verifiedToken = verifyToken(
        accessToken,
        envVars.JWT_ACCESS_SECRET
      ) as JwtPayload;

      const isUserExists = await User.findOne({
        email: verifiedToken.email,
      });

      if (!isUserExists) {
        throw new AppError(httpStatus.BAD_REQUEST, "User Doesn't Exists");
      }
      if (
        isUserExists.isActive === IsActive.BLOCKED ||
        isUserExists.isActive === IsActive.INACTIVE
      ) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `User is ${isUserExists.isActive}`
        );
      }
      if (isUserExists.isDeleted) {
        throw new AppError(httpStatus.BAD_REQUEST, "User is Deleted");
      }

      const userRoles: string[] = Array.isArray(verifiedToken.roles)
        ? verifiedToken.roles
        : [];

      const hasPermission = userRoles.some((role) => authRoles.includes(role));

      if (!hasPermission) {
        throw new AppError(403, "You are not permitted to view this route");
      }

      req.user = verifiedToken;
      next();
    } catch (error) {
      next(error);
    }
  };
