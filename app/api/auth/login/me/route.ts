export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
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
