import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';

export async function GET() {
  const items = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: {
      subcats: { orderBy: { id: 'asc' } },
    },
  });
  return NextResponse.json({ ok: true, items });
}
