import { Router } from "express";

import { ParcelController } from "./parcel.controller";
import {
  createParcelZodSchema,
  updateParcelZodSchema,
} from "./parcel.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";

const router = Router();
router.patch("/test", (req, res) => {
  res.send("PATCH working");
});
router.post(
  "/",
  checkAuth(...Object.values(Role)),
  validateRequest(createParcelZodSchema),
  ParcelController.createParcel
);
router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ParcelController.getAllParcels
);
router.get(
  "/me",
  checkAuth(...Object.values(Role)),
  ParcelController.getMyParcels
);
router.get(
  "/:id/status-log",
  checkAuth(...Object.values(Role)),
  ParcelController.getParcelStatusLogs
);
router.patch(
  "/:id",
  validateRequest(updateParcelZodSchema),
  checkAuth(...Object.values(Role)),
  ParcelController.updateParcel
);
export const parcelRoutes = router;
