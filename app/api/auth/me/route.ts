// app/api/auth/me/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

function getToken(req: NextRequest) {
  return (
    req.cookies.get(SESSION_COOKIE_NAME)?.value ??
    req.cookies.get('token')?.value ??
    req.cookies.get('auth')?.value ??
    req.cookies.get('__session')?.value ??
    null
  );
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ ok: false, user: null });

  const payload = await verifySession(token);
  if (!payload) return NextResponse.json({ ok: false, user: null });

  const { sub, email, role } = payload as any;
  return NextResponse.json({ ok: true, user: { id: sub, email, role: role ?? 'admin' } });
}
