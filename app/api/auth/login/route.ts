export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';



import { getEnv } from '@/lib/cf-env';
const prisma = createPrisma();
const secret = new TextEncoder().encode(getEnv().JWT_SECRET || 'dev-secret-change-me');

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json<any>();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Missing email or password' }, { status: 400 });
    }
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user)
      return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });

    const token = await new SignJWT({ sub: String(user.id), email: user.email, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
