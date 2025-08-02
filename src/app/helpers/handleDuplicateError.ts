import { TGenericErrorResponse } from "../interfaces/errors.types";

export const handleDuplicateError = (err: any): TGenericErrorResponse => {
  const matchedArray = err.message.match(/"([^"]*)"/)[1];
  return {
    statusCode: 400,
    message: `${matchedArray[1]} already exits!!`,
  };
};
