export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';


import { getEnv } from '@/lib/cf-env';
const secret = new TextEncoder().encode(getEnv().JWT_SECRET || 'dev-secret-change-me');

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|;\s*)session=([^;]+)/.exec(cookie);
  if (!m) return NextResponse.json({ ok: false, user: null }, { status: 401 });
  try {
    const { payload } = await jwtVerify(m[1], secret);
    return NextResponse.json({
      ok: true,
      user: { id: payload.sub, email: (payload as any).email },
    });
  } catch {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }
}
