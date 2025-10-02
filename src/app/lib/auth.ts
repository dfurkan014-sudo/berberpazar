// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET .env içinde tanımlı olmalı');
}
const secretKey = new TextEncoder().encode(SECRET);

export const AUTH_COOKIE = 'token';

export type JwtPayload = {
  sub: string;        // user id (string)
  email: string;
  name?: string | null;
};

/** 7 gün geçerli JWT üretir */
export async function signJwt(payload: JwtPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

/** Geçerli ise payload döner; değilse null */
export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as JwtPayload;
  } catch {
    return null;
  }
}
