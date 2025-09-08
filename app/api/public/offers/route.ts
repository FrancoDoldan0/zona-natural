export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';


const prisma = createPrisma();
export async function GET() {
  const now = new Date();
  const items = await prisma.offer.findMany({
    where: {
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  return NextResponse.json({ ok: true, items });
}
