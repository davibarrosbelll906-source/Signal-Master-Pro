import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET || "smp7-dev-secret-change-in-prod";
const ACCESS_EXPIRES = "8h";
const REFRESH_EXPIRES = "30d";

export interface TokenPayload {
  sub: number;
  username: string;
  role: string;
  plan: string;
}

export function signAccess(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefresh(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
