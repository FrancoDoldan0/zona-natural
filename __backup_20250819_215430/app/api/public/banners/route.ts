export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET(req: Request, ctx: { params?: Record<string, string> }) {
  return NextResponse.json({
    ok: true,
    route: 'app/api/public/banners/route.ts',
    params: ctx?.params ?? null,
    note: 'stub',
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Not implemented (stub)' }, { status: 501 });
}
export async function PUT() {
  return NextResponse.json({ ok: false, error: 'Not implemented (stub)' }, { status: 501 });
}
export async function PATCH() {
  return NextResponse.json({ ok: false, error: 'Not implemented (stub)' }, { status: 501 });
}
export async function DELETE() {
  return NextResponse.json({ ok: false, error: 'Not implemented (stub)' }, { status: 501 });
}
