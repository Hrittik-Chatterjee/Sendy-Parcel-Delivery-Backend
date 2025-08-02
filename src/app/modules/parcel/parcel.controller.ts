import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ParcelServices } from "./parcel.service";
import { verifyToken } from "../../utils/jwt";
import { envVars } from "../../config/env";
import { JwtPayload } from "jsonwebtoken";
import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { Role } from "../user/user.interface";

const createParcel = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies.accessToken;
  if (!token) {
    throw new Error("User not authenticated");
  }
  let decoded;
  try {
    decoded = verifyToken(token, envVars.JWT_ACCESS_SECRET) as JwtPayload;
  } catch (err) {
    throw new Error("Invalid token");
  }

  const userId = decoded.userId;

  const result = await ParcelServices.createParcel({
    ...req.body,
    senderId: userId,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Parcel created",
    data: result,
  });
});

const updateParcel = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const parcelId = req.params.id;

    const verifiedToken = req.user;
    const payload = req.body;
    const user = await ParcelServices.updateParcel(
      parcelId,
      payload,
      verifiedToken as JwtPayload
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Parcel Updated Successfully",
      data: user,
    });
  }
);

const getAllParcels = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await ParcelServices.getAllParcels(req.query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "All Parcels Retrieved Successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);

const getMyParcels = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const verifiedToken = req.user as JwtPayload;

    const userId: string = verifiedToken.userId;
    const result = await ParcelServices.getMyParcels(userId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "My Parcels Retrieved Successfully",
      data: result,
    });
  }
);

const getParcelStatusLogs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const verifiedToken = req.user as JwtPayload;
    const userId = verifiedToken.userId;
    const userRoles = verifiedToken.roles;
    console.log({ userRoles });

    const parcel = await ParcelServices.getParcelStatusLogs(id);

    const isSender = parcel.senderId?._id?.toString() === userId;
    const isReceiver = parcel.receiverId?._id?.toString() === userId;
    const isPrivileged =
      userRoles.includes(Role.ADMIN) || userRoles.includes(Role.SUPER_ADMIN);

    if (!isSender && !isReceiver && !isPrivileged) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorixed to see this parcels status log"
      );
    }

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Parcel Status Logs Retrieved Successfully",
      data: parcel.statusLogs,
    });
  }
);
export const ParcelController = {
  createParcel,
  updateParcel,
  getAllParcels,
  getMyParcels,
  getParcelStatusLogs,
};
