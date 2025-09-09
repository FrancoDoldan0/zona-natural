import { jwtVerify, SignJWT } from 'jose';


import { getEnv } from '@/lib/cf-env';
const secret = new TextEncoder().encode(getEnv().JWT_SECRET || 'dev-secret-change-me');

export async function signSession(payload: Record<string, any>, days = 7) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret);
}

export async function verifySession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  } catch {
    return null;
  }
}
