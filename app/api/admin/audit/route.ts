export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
  const items = await prisma.auditLog.findMany({ orderBy: { id: 'desc' }, take: limit });
  return NextResponse.json({ ok: true, items });
}
