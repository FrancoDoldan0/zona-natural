// app/api/auth/login/route.ts
export const runtime = 'edge';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { compareSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma-edge';
import {
  signSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/auth';

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { email = '', password = '' } =
      (await req.json().catch(() => ({}))) as Partial<LoginBody>;

    const emailNorm = email.trim().toLowerCase();

    if (!emailNorm || !password) {
      return NextResponse.json(
        { ok: false, error: 'EMAIL_OR_PASSWORD_MISSING' },
        { status: 400 },
      );
    }

    // Ajustá el modelo si tu esquema usa otro nombre/campos
    const user = await prisma.adminUser.findUnique({
      where: { email: emailNorm },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || !user.passwordHash || !compareSync(password, user.passwordHash)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    // Generar sesión y setear cookie
    const token = await signSession({ sub: user.id, email: user.email, role: 'admin' }, 7);
    const res = NextResponse.json({ ok: true });

    // Misma configuración que usamos en logout (httpOnly/secure/sameSite/Path)
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(7));
    return res;
  } catch (err) {
    console.error('LOGIN_ERROR', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
