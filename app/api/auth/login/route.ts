// app/api/auth/login/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { compareSync } from 'bcryptjs';

// Usa tu helper Edge (ya lo tenés)
import prisma from '@/lib/prisma-edge';

// Cookies/JWT helpers que definimos antes
import {
  signSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // parse seguro
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const email = (body?.email ?? '').toString().trim().toLowerCase();
    const password = (body?.password ?? '').toString();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'MISSING_CREDENTIALS' },
        { status: 400 }
      );
    }

    // Busca por email y trae el hash
    const user = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    // Valida hash
    const ok =
      !!user?.passwordHash && compareSync(password, user.passwordHash);

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Firma sesión y setea cookie segura
    const token = await signSession(
      { sub: user.id, email: user.email, role: 'admin' },
      7
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(7));
    return res;
  } catch (err) {
    // Evita filtrar detalles; responde 500 genérico
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
