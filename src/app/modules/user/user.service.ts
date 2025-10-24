import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IsActive, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import httpStatus from "http-status-codes";
import bcryptjs from "bcryptjs";
import { envVars } from "../../config/env";
import { JwtPayload } from "jsonwebtoken";

const createUser = async (payload: Partial<IUser>) => {
  console.log("Payload received:", payload);

  const { email, password, name, roles, ...rest } = payload;

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

  const userRoles = roles;

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    roles: userRoles,
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

const getAllUsers = async (query: Record<string, any>) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find({})
    .select("-password")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalUsers = await User.countDocuments();
  const totalPages = Math.ceil(totalUsers / limit);

  return {
    data: users,
    meta: {
      total: totalUsers,
      page,
      limit,
      totalPages,
    },
  };
};

const getMe = async (userId: string) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  return {
    data: user,
  };
};

export const UserServices = {
  createUser,
  getAllUsers,
  updateUser,
  getMe,
};
