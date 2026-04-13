import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export interface JwtClaims {
  userId: string;
}

export function signAccessToken(payload: JwtClaims): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL });
}

export function signRefreshToken(payload: JwtClaims): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL });
}

export function verifyAccessToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtClaims;
}

export function verifyRefreshToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtClaims;
}
