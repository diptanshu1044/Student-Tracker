import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export interface JwtClaims {
  userId: string;
}

const accessTokenTtl = env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"];
const refreshTokenTtl = env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"];

export function signAccessToken(payload: JwtClaims): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: accessTokenTtl });
}

export function signRefreshToken(payload: JwtClaims): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: refreshTokenTtl });
}

export function verifyAccessToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtClaims;
}

export function verifyRefreshToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtClaims;
}
