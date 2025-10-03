// app/api/public/banners/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

function toPlacement(p: string | null):
  | 'HOME'
  | 'PRODUCTS'
  | 'CATEGORY'
  | 'CHECKOUT'
  | undefined {
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

  // Activos + dentro de ventana [startAt, endAt]
  const where: any = {
    isActive: true,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };

  if (placement) where.placement = placement;
  // Solo filtramos por categoría si el placement es CATEGORY y manda id válido
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
      linkUrl: true, // en DB puede llamarse linkUrl; el front espera "link"
      placement: true,
      categoryId: true,
      sortOrder: true,
    },
  });

  // Front espera: { id, title, imageUrl, link, placement?, categoryId?, sortOrder? }
  const items = rows
    .map((b) => {
      const img =
        (b.imageKey ? publicR2Url(b.imageKey) : b.imageUrl) || ''; // string (no null)
      if (!img) return null; // sin imagen, lo omitimos
      return {
        id: b.id,
        title: b.title,
        imageUrl: img,
        link: b.linkUrl ?? null,
        placement: b.placement,
        categoryId: b.categoryId ?? null,
        sortOrder: b.sortOrder,
      };
    })
    .filter(Boolean);

  return NextResponse.json(
    { ok: true, items },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
