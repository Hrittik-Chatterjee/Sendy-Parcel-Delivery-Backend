import mongoose from "mongoose";
import { TGenericErrorResponse } from "../interfaces/errors.types";

export const handleCastError = (
  err: mongoose.Error.CastError
): TGenericErrorResponse => {
  return {
    statusCode: 400,
    message: "Invalid Mongodb ObjectID. Please provide a val",
  };
};
