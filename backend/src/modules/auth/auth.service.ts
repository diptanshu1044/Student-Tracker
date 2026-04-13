import bcrypt from "bcrypt";
import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { RefreshTokenModel } from "../../models/refresh-token.model";
import { UserModel } from "../../models/user.model";
import { AppError } from "../../shared/utils/app-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/jwt";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRefreshExpiryDate(): Date {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return new Date(now + sevenDaysMs);
}

async function persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
  await RefreshTokenModel.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshExpiryDate()
  });
}

export async function registerUser(input: RegisterInput) {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    throw new AppError("Email already in use", StatusCodes.CONFLICT);
  }

  const password = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    password
  });

  const accessToken = signAccessToken({ userId: user._id.toString() });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });

  await persistRefreshToken(user._id.toString(), refreshToken);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function loginUser(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email });
  if (!user) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const isValid = await bcrypt.compare(input.password, user.password);
  if (!isValid) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const accessToken = signAccessToken({ userId: user._id.toString() });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });
  await persistRefreshToken(user._id.toString(), refreshToken);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function rotateRefreshToken(inputToken: string) {
  const claims = verifyRefreshToken(inputToken);
  const tokenHash = hashToken(inputToken);

  const persisted = await RefreshTokenModel.findOne({
    userId: claims.userId,
    tokenHash
  });

  if (!persisted) {
    throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED);
  }

  await RefreshTokenModel.deleteOne({ _id: persisted._id });

  const accessToken = signAccessToken({ userId: claims.userId });
  const refreshToken = signRefreshToken({ userId: claims.userId });
  await persistRefreshToken(claims.userId, refreshToken);

  return {
    accessToken,
    refreshToken
  };
}
