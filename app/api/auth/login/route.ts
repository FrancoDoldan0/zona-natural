// app/api/auth/login/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { compareSync } from 'bcryptjs';

// ⚠️ Usar el mismo helper que en el resto de las rutas Edge
import { createPrisma } from '@/lib/prisma-edge';
import {
  signSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/auth';

const prisma = createPrisma();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const email = (body?.email ?? '').toString().trim().toLowerCase();
    const password = (body?.password ?? '').toString();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'MISSING_CREDENTIALS' },
        { status: 400 },
      );
    }

    // 1) Intento DB (adminUser)
    let user =
      (await prisma.adminUser.findUnique({
        where: { email },
        select: { id: true, email: true, passwordHash: true },
      }).catch(() => null)) || null;

    let isValid =
      !!user?.passwordHash && compareSync(password, user.passwordHash);

    // 2) Fallback por ENV (por si en prod no está seed del admin)
    if (!isValid) {
      const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
      const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''; // opcional

      const envEmailOK = ADMIN_EMAIL && email === ADMIN_EMAIL;
      const envPassOK =
        (!!ADMIN_PASSWORD && password === ADMIN_PASSWORD) ||
        (!!ADMIN_PASSWORD_HASH && compareSync(password, ADMIN_PASSWORD_HASH));

      if (envEmailOK && envPassOK) {
        // simulo user desde ENV
        user = { id: 0 as any, email: ADMIN_EMAIL, passwordHash: '' } as any;
        isValid = true;
      }
    }

    if (!isValid || !user) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    // 3) Firma sesión (requiere AUTH_SECRET/NEXTAUTH_SECRET configurado)
    const token = await signSession(
      { sub: String(user.id || 'env-admin'), email: user.email, role: 'admin' },
      7,
    );

    // 4) Cookie segura (sin domain -> válida en cada host)
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions(7),
      // asegúrate que sessionCookieOptions NO fije "domain"
      // domain: undefined,
    });
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
