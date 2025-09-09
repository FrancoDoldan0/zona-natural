// app/api/admin/search/products/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';


const prisma = createPrisma();
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const takeRaw = searchParams.get('take') || '20';
    const take = Math.max(1, Math.min(50, Number(takeRaw) || 20));

    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } },
            { sku:  { contains: q } },
          ],
        }
      : undefined;

    const items = await prisma.product.findMany({
      where,
      take,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'unknown_error' },
      { status: 500 }
    );
  }
}
