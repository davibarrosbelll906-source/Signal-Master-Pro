import jwt from "jsonwebtoken";

const ACCESS_SECRET =
  process.env.SESSION_SECRET || "smp7-access-dev-secret-change-in-prod";

const REFRESH_SECRET =
  process.env.REFRESH_SECRET ||
  process.env.SESSION_SECRET ||
  "smp7-refresh-dev-secret-change-in-prod";

// Access token curto — se vazar, expira rápido
const ACCESS_EXPIRES = "15m";

// Refresh token longo — usado apenas para emitir novo access token
const REFRESH_EXPIRES = "30d";

export interface TokenPayload {
  sub: number;
  username: string;
  role: string;
  plan: string;
}

export function signAccess(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefresh(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyToken(token: string): TokenPayload {
  // Tenta access secret primeiro, depois refresh secret
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  }
}

export function verifyRefresh(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
