import z from "zod";

const objectIdSchema = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Must be a valid MongoDB ObjectId",
  });

const statusEnum = z.enum([
  "Requested",
  "Approved",
  "Dispatched",
  "In Transit",
  "Delivered",
  "Cancelled",
]);

const statusLogSchema = z.object({
  status: z.enum([
    "Requested",
    "Approved",
    "Dispatched",
    "In Transit",
    "Delivered",
    "Cancelled",
  ]),
  timestamp: z.coerce.date(),
  updatedBy: objectIdSchema.optional(),
  location: z.string().optional(),
  note: z.string().optional(),
});

export const createParcelZodSchema = z.object({
  receiverId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "receiverId must be a valid ObjectId string",
  }),
  weight: z.number().positive(),
  pickupAddress: z.string().min(1, "Pickup address is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
});

export const updateParcelZodSchema = z.object({
  trackingId: z
    .string({ invalid_type_error: "Tracking id must be string" })
    .optional(),

  senderId: objectIdSchema.optional(),
  receiverId: objectIdSchema.optional(),
  weight: z
    .number({ invalid_type_error: "Weight must be a number" })
    .positive({ message: "Weight must be greater than 0" })
    .optional(),
  fee: z
    .number({ invalid_type_error: "Fee must be a number" })
    .nonnegative({ message: "Fee must be zero or positive" })
    .optional(),

  pickupAddress: z
    .string({ invalid_type_error: "Pickup address must be a string" })
    .min(1, { message: "Pickup address is required" })
    .optional(),

  deliveryAddress: z
    .string({ invalid_type_error: "Delivery address must be a string" })
    .min(1, { message: "Delivery address is required" })
    .optional(),

  currentStatus: statusEnum.optional(),

  statusLogs: z.array(statusLogSchema).optional(),

  isBlocked: z
    .boolean({ invalid_type_error: "isBlocked must be true or false" })
    .optional(),
});
