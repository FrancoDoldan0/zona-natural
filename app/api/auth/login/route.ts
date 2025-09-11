// app/api/auth/login/route.ts
export const runtime = 'edge';

import { NextResponse, NextRequest } from 'next/server';
import { compareSync } from 'bcryptjs';
// ⬇️ AJUSTA este import según tu helper real:
import { prisma } from '@/lib/prisma-edge'; 
import { signSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || '').toString().trim().toLowerCase();
    const password = (body?.password || '').toString();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'email_or_password_missing' },
        { status: 400 }
      );
    }

    // Busca admin por email
    const user = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user?.passwordHash || !compareSync(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    }

    // Crea JWT (7 días por defecto; podés cambiarlo)
    const token = await signSession(
      { uid: user.id, email: user.email, role: 'admin' },
      7
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(7) // httpOnly, secure(prod), sameSite=lax, path=/, maxAge
    );

    return res;
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
