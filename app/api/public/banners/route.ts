export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

function toPlacement(p: string | null): 'HOME' | 'PRODUCTS' | 'CATEGORY' | 'CHECKOUT' | undefined {
  if (!p) return undefined;
  switch (p.toLowerCase()) {
    case 'home':
      return 'HOME';
    case 'products':
      return 'PRODUCTS';
    case 'category':
      return 'CATEGORY';
    case 'checkout':
      return 'CHECKOUT';
    default:
      return undefined;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const placement = toPlacement(url.searchParams.get('placement'));
  const categoryIdRaw = url.searchParams.get('categoryId');
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;
  const now = new Date();

  const where: any = {
    isActive: true,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };

  if (placement) where.placement = placement;
  // Solo filtramos por categoría si mandan el id y el placement es CATEGORY
  if (placement === 'CATEGORY' && Number.isFinite(categoryId)) {
    where.categoryId = Number(categoryId);
  }

  const rows = await prisma.banner.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      imageUrl: true,
      imageKey: true,
      linkUrl: true, // <- ya mapeado a columna "link" en el schema
      placement: true,
      categoryId: true,
      sortOrder: true,
    },
  });

  const items = rows.map((b) => ({
    id: b.id,
    title: b.title,
    url: b.imageKey ? publicR2Url(b.imageKey) : b.imageUrl, // R2 primero, legacy fallback
    linkUrl: b.linkUrl ?? null,
    placement: b.placement,
    categoryId: b.categoryId ?? null,
    sortOrder: b.sortOrder,
  }));

  return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'no-store' } });
}
