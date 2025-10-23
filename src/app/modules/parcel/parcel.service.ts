import { Types } from "mongoose";
import { IParcel, IStatusLog } from "./parcel.interface";
import { Parcel } from "./parcel.model";

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
  const initialStatusLog: IStatusLog = {
    status: "Requested",
    updatedBy: payload.senderId,
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

  // Admin/Super Admin has priority - they can update regardless of other roles
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

  // Receivers (who are not admins) cannot update parcels
  if (isReceiver) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Receivers are not allowed to update parcel"
    );
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

const trackParcelByTrackingId = async (trackingId: string) => {
  const parcel = await Parcel.findOne({ trackingId })
    .populate("senderId", "name email phone")
    .populate("receiverId", "name email phone")
    .select("-__v");

  if (!parcel) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Parcel not found with this tracking ID"
    );
  }

  return {
    trackingId: parcel.trackingId,
    currentStatus: parcel.currentStatus,
    pickupAddress: parcel.pickupAddress,
    deliveryAddress: parcel.deliveryAddress,
    weight: parcel.weight,
    fee: parcel.fee,
    statusLogs: parcel.statusLogs,
    createdAt: parcel.createdAt,
    updatedAt: parcel.updatedAt,
  };
};

const confirmDelivery = async (parcelId: string, userId: string) => {
  const parcel = await Parcel.findById(parcelId);

  if (!parcel) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }

  if (parcel.receiverId.toString() !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only the receiver can confirm delivery"
    );
  }

  if (parcel.currentStatus !== "In Transit") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot confirm delivery. Parcel must be "In Transit" but current status is "${parcel.currentStatus}"`
    );
  }

  const updatedParcel = await Parcel.findByIdAndUpdate(
    parcelId,
    {
      currentStatus: "Delivered",
      $push: {
        statusLogs: {
          status: "Delivered",
          timestamp: new Date(),
          updatedBy: new Types.ObjectId(userId),
          note: "Delivery confirmed by receiver",
        },
      },
    },
    { new: true, runValidators: true }
  )
    .populate("senderId", "name email")
    .populate("receiverId", "name email");

  return updatedParcel;
};

const cancelDelivery = async (parcelId: string, userId: string) => {
  const parcel = await Parcel.findById(parcelId);

  if (!parcel) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }

  if (parcel.senderId.toString() !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only the sender can cancel this parcel"
    );
  }

  const nonCancellableStatuses = ["Dispatched", "In Transit", "Delivered"];
  if (nonCancellableStatuses.includes(parcel.currentStatus)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot cancel parcel after it has been ${parcel.currentStatus.toLowerCase()}`
    );
  }

  if (parcel.currentStatus === "Cancelled") {
    throw new AppError(httpStatus.BAD_REQUEST, "Parcel is already cancelled");
  }

  const updatedParcel = await Parcel.findByIdAndUpdate(
    parcelId,
    {
      currentStatus: "Cancelled",
      $push: {
        statusLogs: {
          status: "Cancelled",
          timestamp: new Date(),
          updatedBy: new Types.ObjectId(userId),
          note: "Parcel cancelled by sender",
        },
      },
    },
    { new: true, runValidators: true }
  )
    .populate("senderId", "name email")
    .populate("receiverId", "name email");

  return updatedParcel;
};

export const ParcelServices = {
  createParcel,
  updateParcel,
  getAllParcels,
  getMyParcels,
  getParcelStatusLogs,
  trackParcelByTrackingId,
  confirmDelivery,
  cancelDelivery,
};
