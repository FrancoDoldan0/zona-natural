import { cookies, headers } from 'next/headers';
import { getDB } from './db';
import { adminUser, session as sessionTable } from './schema';
import { and, eq } from 'drizzle-orm';
import { hashSync, compareSync } from 'bcryptjs';

const COOKIE_NAME = 'zn_sess';
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 días

export async function hashPassword(password: string) {
  // sync para Edge Runtime
  return hashSync(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  // sync para Edge Runtime
  return compareSync(password, hash);
}

function toHex(u8: Uint8Array) {
  return [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(buf));
}

export async function createSession(userId: string) {
  const db = getDB();
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = toHex(tokenBytes); // base16 seguro y simple
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const expires = now + SESSION_TTL_SEC;

  const ip = headers().get('x-forwarded-for') || headers().get('cf-connecting-ip') || '';
  const ua = headers().get('user-agent') || '';

  await db.insert(sessionTable).values({
    id: crypto.randomUUID(),
    adminUserId: userId,
    tokenHash,
    expiresAt: expires,
    ip,
    userAgent: ua
  });

  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV !== 'development',
    maxAge: SESSION_TTL_SEC
  });

  return { token, expires };
}

export async function destroySession() {
  const db = getDB();
  const cookie = cookies().get(COOKIE_NAME);
  if (!cookie) return;
  const tokenHash = await sha256Hex(cookie.value);
  await db.delete(sessionTable).where(eq(sessionTable.tokenHash, tokenHash));
  cookies().set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 });
}

export type SafeUser = { id: string; email: string; role: string };

export async function getCurrentUser(): Promise<SafeUser | null> {
  const db = getDB();
  const cookie = cookies().get(COOKIE_NAME);
  if (!cookie) return null;
  const tokenHash = await sha256Hex(cookie.value);
  const now = Math.floor(Date.now() / 1000);

  const rows = await db
    .select({
      uid: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      expiresAt: sessionTable.expiresAt
    })
    .from(sessionTable)
    .innerJoin(adminUser, eq(sessionTable.adminUserId, adminUser.id))
    .where(and(eq(sessionTable.tokenHash, tokenHash)));

  const row = rows[0];
  if (!row || row.expiresAt < now) {
    cookies().set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 });
    return null;
  }
  return { id: row.uid, email: row.email, role: row.role };
}
