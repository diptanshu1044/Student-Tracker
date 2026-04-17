import crypto from "crypto";
import { env } from "../../config/env";
import { AppError } from "./app-error";
import { StatusCodes } from "http-status-codes";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  if (!env.DATA_ENCRYPTION_KEY) {
    throw new AppError("DATA_ENCRYPTION_KEY is required for this operation", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return crypto.createHash("sha256").update(env.DATA_ENCRYPTION_KEY).digest();
}

export function encryptJson(payload: Record<string, unknown>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getKey(), iv);
  const serialized = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptJson<T>(encryptedPayload: string): T {
  const [ivBase64, tagBase64, dataBase64] = encryptedPayload.split(".");

  if (!ivBase64 || !tagBase64 || !dataBase64) {
    throw new AppError("Invalid encrypted payload", StatusCodes.BAD_REQUEST);
  }

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getKey(),
    Buffer.from(ivBase64, "base64")
  );

  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataBase64, "base64")),
    decipher.final()
  ]).toString("utf8");

  return JSON.parse(decrypted) as T;
}
