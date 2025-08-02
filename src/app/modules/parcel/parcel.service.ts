import { Types } from "mongoose";
import { IParcel, IStatusLog } from "./parcel.interface";
import { Parcel } from "./parcel.model";
import { User } from "../user/user.model";
import AppError from "../../errorHelpers/AppError";
import httpStatus from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { Role } from "../user/user.interface";

const createParcel = async (payload: Partial<IParcel>) => {
  const existingParcel = await Parcel.findOne({
    trackingId: payload.trackingId,
  });
  if (existingParcel) {
    throw new Error("A parcel already exists");
  }
  const systemUserId = new Types.ObjectId("688b9d551a098dbd0df24a3e");
  const initialStatusLog: IStatusLog = {
    status: "Requested",
    updatedBy: systemUserId, // who created the parcel
    timestamp: new Date(),
    location: payload.pickupAddress || "",
    note: "Parcel created",
  };

  payload.statusLogs = [initialStatusLog];

  const parcel = await Parcel.create(payload);

  return parcel;
};

const updateParcel = async (
  parcelId: string,
  payload: Partial<IParcel>,
  decodedToken: JwtPayload
) => {
  const ifParcelExits = await Parcel.findById(parcelId);
  if (!ifParcelExits) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel Not Found");
  }

  const tokenRoles: string[] = decodedToken.roles;
  const isAdmin =
    tokenRoles.includes(Role.ADMIN) || tokenRoles.includes(Role.SUPER_ADMIN);
  const isSender = tokenRoles.includes(Role.SENDER);
  const isReceiver = tokenRoles.includes(Role.RECEIVER);
  if (isReceiver) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Receivers are not allowed to update parcel"
    );
  }

  if (isAdmin) {
    const updatedParcel = await Parcel.findByIdAndUpdate(parcelId, payload, {
      new: true,
      runValidators: true,
    });
    return updatedParcel;
  }

  if (isSender) {
    if (ifParcelExits.senderId.toString() !== decodedToken.userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to update this parcel"
      );
    }
    if (ifParcelExits.currentStatus !== "Requested") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only edit parcels in 'Requested' status"
      );
    }

    if (
      payload._id ||
      payload.currentStatus ||
      payload.fee ||
      payload.isBlocked ||
      payload.senderId ||
      payload.statusLogs ||
      payload.trackingId
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to change these fields"
      );
    }

    const updatedParcel = await Parcel.findByIdAndUpdate(parcelId, payload, {
      new: true,
      runValidators: true,
    });
    return updatedParcel;
  }

  throw new AppError(
    httpStatus.FORBIDDEN,
    "You are not authorized to update parcel"
  );
};

const getAllParcels = async (query: Record<string, any>) => {
  const filter: Record<string, any> = {};

  if (query.currentStatus) {
    filter.currentStatus = query.currentStatus;
  }

  const parcels = await Parcel.find(filter);
  const totalParcels = await Parcel.countDocuments(filter);
  return {
    data: parcels,
    meta: {
      total: totalParcels,
    },
  };
};

const getMyParcels = async (userId: string) => {
  const sent = await Parcel.find({ senderId: userId })
    .populate("receiverId", "name email")
    .sort({ createdAt: -1 });

  const received = await Parcel.find({ receiverId: userId })
    .populate("senderId", "name email")
    .sort({ createdAt: -1 });

  return { sent, received };
};
const getParcelStatusLogs = async (parcelId: string) => {
  const parcel = await Parcel.findById(parcelId).populate([
    "senderId",
    "receiverId",
  ]);

  if (!parcel) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel doesnt exits");
  }

  return parcel;
};
export const ParcelServices = {
  createParcel,
  updateParcel,
  getAllParcels,
  getMyParcels,
  getParcelStatusLogs,
};
