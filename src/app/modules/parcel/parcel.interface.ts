import { Types } from "mongoose";

export interface IStatusLog {
  status:
    | "Requested"
    | "Approved"
    | "Dispatched"
    | "In Transit"
    | "Delivered"
    | "Cancelled";
  timestamp: Date;
  updatedBy?: Types.ObjectId;
  location?: string;
  note?: string;
}

export interface IParcel {
  _id?: string;
  trackingId: string;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  weight: number;
  fee: number;
  pickupAddress: string;
  deliveryAddress: string;
  currentStatus: IStatusLog["status"];
  statusLogs: IStatusLog[];
  isBlocked?: boolean;
}
