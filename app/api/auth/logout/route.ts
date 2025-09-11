// app/api/auth/logout/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth';

function clearSession(res: NextResponse) {
  // Borra la cookie usando exactamente los mismos flags que al setearla
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(7),
    maxAge: 0, // expirar inmediatamente
  });
}

// Permite logout vía POST (fetch)
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSession(res);
  return res;
}

// (Opcional) logout por GET (enlace)
export async function GET(req: Request) {
  const base = new URL(req.url).origin; // base del request (Edge-safe)
  const loginUrl = new URL('/admin/login', base);
  const res = NextResponse.redirect(loginUrl);
  clearSession(res);
  return res;
}
