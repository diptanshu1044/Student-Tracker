import bcrypt from "bcrypt";
import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { EmailVerificationTokenModel } from "../../models/email-verification-token.model";
import { RefreshTokenModel } from "../../models/refresh-token.model";
import { UserModel } from "../../models/user.model";
import { sendMail } from "../../shared/utils/mailer";
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

function getEmailVerificationExpiryDate(): Date {
  const ttlMs = env.EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000;
  return new Date(Date.now() + ttlMs);
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

async function sendEmailVerification(user: { _id: { toString(): string }; name: string; email: string }) {
  const rawToken = crypto.randomBytes(32).toString("hex");

  await EmailVerificationTokenModel.create({
    userId: user._id.toString(),
    tokenHash: hashToken(rawToken),
    expiresAt: getEmailVerificationExpiryDate()
  });

  const verificationLink = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/v1/auth/verify-email?token=${rawToken}`;

  await sendMail({
    to: user.email,
    subject: "Verify your StudentOS account",
    text: `Hi ${user.name},\n\nPlease verify your email by clicking this link:\n${verificationLink}\n\nThis link expires in ${env.EMAIL_VERIFICATION_TTL_MINUTES} minutes.`
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
    password,
    emailVerified: env.EMAIL_VERIFICATION_MOCK
  });

  if (!env.EMAIL_VERIFICATION_MOCK) {
    await sendEmailVerification(user);
  }

  const accessToken = signAccessToken({ userId: user._id.toString() });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });

  await persistRefreshToken(user._id.toString(), refreshToken);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified
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
      email: user.email,
      emailVerified: user.emailVerified
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

export async function verifyEmailToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const verification = await EmailVerificationTokenModel.findOne({
    tokenHash,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  });

  if (!verification) {
    throw new AppError("Invalid or expired verification token", StatusCodes.BAD_REQUEST);
  }

  await Promise.all([
    UserModel.updateOne({ _id: verification.userId }, { $set: { emailVerified: true } }),
    EmailVerificationTokenModel.updateOne({ _id: verification._id }, { $set: { usedAt: new Date() } })
  ]);

  return { verified: true as const };
}

export async function resendEmailVerification(userId: string) {
  if (env.EMAIL_VERIFICATION_MOCK) {
    return { sent: false as const, reason: "mock_enabled" as const };
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  if (user.emailVerified) {
    return { sent: false as const, reason: "already_verified" as const };
  }

  await sendEmailVerification(user);
  return { sent: true as const };
}

export async function getCurrentUser(userId: string) {
  const user = await UserModel.findById(userId).select("name email emailVerified googleCalendarConnected");

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    googleCalendarConnected: user.googleCalendarConnected
  };
}
