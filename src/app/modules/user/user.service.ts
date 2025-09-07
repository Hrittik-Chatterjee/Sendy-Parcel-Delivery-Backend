import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IsActive, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import httpStatus from "http-status-codes";
import bcryptjs from "bcryptjs";
import { envVars } from "../../config/env";
import { JwtPayload } from "jsonwebtoken";

const createUser = async (payload: Partial<IUser>) => {
  console.log("Payload received:", payload);

  const { email, password, name, ...rest } = payload;

  const isUserExists = await User.findOne({ email });

  if (isUserExists) {
    throw new AppError(httpStatus.BAD_REQUEST, "User Already Exists");
  }

  const hashedPassword = await bcryptjs.hash(
    password!,
    Number(envVars.BCRYPT_SALT_ROUND)
  );

  const authprovider: IAuthProvider = {
    provider: "credentials",
    providerId: email!,
  };
  
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    roles: [Role.SENDER, Role.RECEIVER], // Default roles for new users
    auths: authprovider,
    ...rest,
  });
  return user;
};

const updateUser = async (
  userId: string,
  payload: Partial<IUser>,
  decodedToken: JwtPayload
) => {
  const ifUserExists = await User.findById(userId);
  if (!ifUserExists) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  const tokenRoles: string[] = decodedToken.roles;

  if (payload.roles) {
    if (
      !tokenRoles.includes(Role.ADMIN) &&
      !tokenRoles.includes(Role.SUPER_ADMIN)
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to change roles"
      );
    }

    if (
      payload.roles.includes(Role.SUPER_ADMIN) &&
      !tokenRoles.includes(Role.SUPER_ADMIN)
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only Super Admin can assign SUPER_ADMIN role"
      );
    }
  }

  if (
    payload.isActive !== undefined ||
    payload.isDeleted !== undefined ||
    payload.isVerified !== undefined
  ) {
    if (
      !tokenRoles.includes(Role.ADMIN) &&
      !tokenRoles.includes(Role.SUPER_ADMIN)
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to update these fields"
      );
    }
  }

  if (payload.password) {
    payload.password = await bcryptjs.hash(
      payload.password,
      Number(envVars.BCRYPT_SALT_ROUND)
    );
  }

  const newUpdatedUser = await User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });

  return newUpdatedUser;
};

const getAllUsers = async () => {
  const users = await User.find({});
  const totalUsers = await User.countDocuments();
  return {
    data: users,
    meta: {
      total: totalUsers,
    },
  };
};

export const UserServices = {
  createUser,
  getAllUsers,
  updateUser,
};
