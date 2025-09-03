export const runtime = 'edge';
import { NextResponse } from 'next/server';
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: 'session', value: '', path: '/', httpOnly: true, maxAge: 0 });
  return res;
}
