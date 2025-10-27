import { Schema, UpdateQuery, model } from "mongoose";
import { IParcel, IStatusLog } from "./parcel.interface";
import crypto from "crypto";
import { User } from "../user/user.model";
import { Role } from "../user/user.interface";
const statusLogSchema = new Schema<IStatusLog>(
  {
    status: {
      type: String,
      enum: [
        "Requested",
        "Approved",
        "Dispatched",
        "In Transit",
        "Delivered",
        "Cancelled",
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    location: String,
    note: String,
  },
  { _id: false }
);

const parcelSchema = new Schema<IParcel>(
  {
    trackingId: { type: String, unique: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weight: { type: Number, required: true },

    fee: { type: Number },
    pickupAddress: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    currentStatus: { type: String, default: "Requested" },
    statusLogs: { type: [statusLogSchema], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

parcelSchema.pre("save", function (next) {
  if (!this.trackingId) {
    const randomCode = crypto.randomBytes(16).toString("hex");
    this.trackingId = `TRK${randomCode}`;
  }
  this.fee = this.weight * 50;
  next();
});

parcelSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (update && !Array.isArray(update)) {
    const typedUpdate = update as UpdateQuery<Partial<IParcel>>;

    if (
      typedUpdate.currentStatus &&
      typedUpdate.currentStatus !== "Requested"
    ) {
      try {
        const parcel = await this.model.findOne(this.getQuery());

        if (parcel && parcel.currentStatus !== typedUpdate.currentStatus) {
          const receiver = await User.findById(parcel.receiverId);
          if (receiver) {
            const receiverRole = "RECEIVER" as Role;
            if (!receiver.roles.includes(receiverRole)) {
              receiver.roles.push(receiverRole);
              await receiver.save();
            }
          }

          if (!typedUpdate.statusLogs) {
            const newLog = {
              status: typedUpdate.currentStatus,
              timestamp: new Date(),
              updatedBy: typedUpdate.updatedBy,
              location: typedUpdate.location || parcel.deliveryAddress,
              note: `Status changed to ${typedUpdate.currentStatus}`,
            };

            this.setUpdate({
              ...typedUpdate,
              $push: {
                statusLogs: newLog,
              },
            });
          } else {
            const updateObj = { ...typedUpdate };
            delete (updateObj as any).$push;

            this.setUpdate({
              $set: {
                ...updateObj,
              },
            });
          }
        }
      } catch (error: any) {
        return next(error);
      }
    }
  }

  next();
});
export const Parcel = model<IParcel>("Parcel", parcelSchema);
