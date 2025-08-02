import { envVars } from "../config/env";

import brcyrptjs from "bcryptjs";
import { User } from "../modules/user/user.model";
import { IAuthProvider, IUser, Role } from "../modules/user/user.interface";

export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExists = await User.findOne({
      email: envVars.SUPER_ADMIN_EMAIL,
    });

    if (isSuperAdminExists) {
      console.log("Super Admin Already Exits");
      return;
    }
    console.log("trying to create super admin");
    const hashedPassword = await brcyrptjs.hash(
      envVars.SUPER_ADMIN_PASSWORD,
      Number(envVars.BCRYPT_SALT_ROUND)
    );

    const authProvder: IAuthProvider = {
      provider: "credentials",
      providerId: envVars.SUPER_ADMIN_EMAIL,
    };

    const payload: IUser = {
      name: "Super admin",
      roles: [Role.SUPER_ADMIN],
      email: envVars.SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      auths: [authProvder],
      isVerified: true,
    };

    const superadmin = await User.create(payload);
    console.log(superadmin, "Super admin created successfully");
  } catch (error) {
    console.log(error);
  }
};
